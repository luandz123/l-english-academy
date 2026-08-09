import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read env variables
const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("🔐 Logging in as admin...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "admin@lenglish.vn",
    password: "Admin@123456",
  });
  if (authErr) {
    console.error("❌ Login failed:", authErr.message);
    process.exit(1);
  }
  console.log("✅ Logged in successfully!");

  const args = process.argv.slice(2);
  const fileArgIdx = args.indexOf('--file');
  if (fileArgIdx === -1 || fileArgIdx + 1 >= args.length) {
    console.error("Usage: node import_course.js --file <path_to_consolidated_json>");
    process.exit(1);
  }

  const jsonPath = args[fileArgIdx + 1];
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: File not found at ${jsonPath}`);
    process.exit(1);
  }

  const skipMediaUpload = args.includes('--skip-media-upload');
  if (skipMediaUpload) {
    console.log("⚡️ Media upload will be skipped. Using original URLs directly.");
  }

  console.log(`📖 Reading JSON file from ${jsonPath}...`);
  const fileContent = fs.readFileSync(jsonPath, 'utf8');
  const parsedData = JSON.parse(fileContent);

  if (!parsedData.course_title || !Array.isArray(parsedData.exams)) {
    console.error("Error: Invalid JSON format. Must contain 'course_title' and 'exams' array.");
    process.exit(1);
  }

  const courseTitle = parsedData.course_title;
  console.log(`🎯 Course Title: "${courseTitle}"`);

  // 1. Find or create course
  console.log("🔍 Checking if course already exists...");
  const { data: existingCourse, error: courseFetchErr } = await supabase
    .from("courses")
    .select("id")
    .eq("title", courseTitle)
    .maybeSingle();

  if (courseFetchErr) {
    console.error("Error fetching course:", courseFetchErr);
    process.exit(1);
  }

  let targetCourseId;
  if (existingCourse) {
    targetCourseId = existingCourse.id;
    console.log(`✅ Found existing course with ID: ${targetCourseId}`);
  } else {
    console.log(`➕ Creating new course: "${courseTitle}"...`);
    const { data: newCourse, error: courseCreateErr } = await supabase
      .from("courses")
      .insert({
        title: courseTitle,
        subtitle: "Bộ đề thi thử TOEIC sát đề thi thật 2026",
        course_type: "fulltest",
        is_active: true,
        price: 0,
        duration_months: 12,
        instructor: "Cô Mai Phương",
      })
      .select("id")
      .single();

    if (courseCreateErr) {
      console.error("Error creating course:", courseCreateErr);
      process.exit(1);
    }
    targetCourseId = newCourse.id;
    console.log(`✅ Created course with ID: ${targetCourseId}`);
  }

  const exams = parsedData.exams;
  const totalExams = exams.length;
  console.log(`📦 Found ${totalExams} exams to process.`);

  // Process exams sequentially
  for (let exIdx = 0; exIdx < totalExams; exIdx++) {
    const exam = exams[exIdx];
    const examTitle = exam.exam_title || exam.title || `Đề thi số ${exIdx + 1}`;
    console.log(`\n---------------------------------------------------------`);
    console.log(`🚀 [Exam ${exIdx + 1}/${totalExams}] Processing "${examTitle}"...`);

    let testId;
    // Check if exam already exists under this course
    const { data: existingTest, error: testFetchErr } = await supabase
      .from("full_tests")
      .select("id")
      .eq("title", examTitle)
      .eq("course_id", targetCourseId)
      .maybeSingle();

    if (testFetchErr) {
      console.error("Error fetching test:", testFetchErr);
      continue;
    }

    if (existingTest) {
      testId = existingTest.id;
      console.log(`✅ Found existing test (ID: ${testId}). Clearing old questions to overwrite...`);

      // Clean up old questions
      const { data: oldSections } = await supabase
        .from("full_test_sections")
        .select("quiz_id")
        .eq("test_id", testId);

      if (oldSections && oldSections.length > 0) {
        const quizIds = oldSections.map((s) => s.quiz_id).filter(Boolean);
        if (quizIds.length > 0) {
          const { error: deleteErr } = await supabase
            .from("questions")
            .delete()
            .in("quiz_id", quizIds);
          if (deleteErr) {
            console.error("Error deleting old questions:", deleteErr);
          } else {
            console.log(`🧹 Deleted old questions from quizzes: [${quizIds.join(', ')}]`);
          }
        }
      }
    } else {
      console.log(`➕ Creating new full_test: "${examTitle}"...`);
      const { data: newTest, error: testCreateErr } = await supabase
        .from("full_tests")
        .insert({
          title: examTitle,
          course_id: targetCourseId,
          audio_url: exam.audio_url || null,
        })
        .select("id")
        .single();

      if (testCreateErr) {
        console.error("Error creating full_test:", testCreateErr);
        continue;
      }
      testId = newTest.id;
      console.log(`✅ Created test with ID: ${testId}`);

      // Create 7 sections
      console.log(`➕ Creating 7 sections and quizzes for "${examTitle}"...`);
      const sectionsToInsert = [];
      for (let part = 1; part <= 7; part++) {
        const { data: newQuiz, error: quizError } = await supabase
          .from("quizzes")
          .insert({
            title: `Part ${part} - ${examTitle}`,
            total_questions: 0,
            display_order: part,
          })
          .select("id")
          .single();

        if (quizError) {
          console.error(`Error creating quiz for Part ${part}:`, quizError);
          continue;
        }

        sectionsToInsert.push({
          test_id: testId,
          part_number: part,
          quiz_id: newQuiz.id,
        });
      }

      const { error: secErr } = await supabase.from("full_test_sections").insert(sectionsToInsert);
      if (secErr) {
        console.error("Error inserting full_test_sections:", secErr);
        continue;
      }
      console.log("✅ Created sections mapping successfully.");
    }

    // Get sections mapping
    const { data: sections, error: secErr } = await supabase
      .from("full_test_sections")
      .select("part_number, quiz_id")
      .eq("test_id", testId);

    if (secErr || !sections || sections.length === 0) {
      console.error(`Error: Could not retrieve sections for test "${examTitle}".`);
      continue;
    }

    const quizMap = {};
    sections.forEach((s) => {
      quizMap[s.part_number] = s.quiz_id;
    });

    // Media cache to prevent double upload of same URL in this exam run
    const mediaCache = {};
    const uploadMedia = async (url, index, type) => {
      if (skipMediaUpload) return url;
      if (!url || !url.startsWith("http")) return url;
      if (mediaCache[url]) return mediaCache[url];

      if (url.includes("supabase.co") || url.includes("/storage/v1/object/public/materials")) {
        return url;
      }

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch status ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const ext = url.split(".").pop()?.split("?")[0] || (type === "audio" ? "mp3" : "jpg");
        const pathStr = `full_test_media/${testId}/part_${type}_${index}_${Date.now()}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("materials")
          .upload(pathStr, buffer, {
            contentType: type === 'audio' ? 'audio/mpeg' : 'image/jpeg',
            duplex: 'half'
          });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("materials").getPublicUrl(pathStr);
        mediaCache[url] = urlData.publicUrl;
        return urlData.publicUrl;
      } catch (e) {
        console.error(`⚠️ Failed to upload media: ${url}. Error: ${e.message}. Using fallback original URL.`);
        return url;
      }
    };

    // Main Audio upload
    if (exam.audio_url) {
      console.log("🎵 Uploading main Listening audio...");
      const finalMainAudio = await uploadMedia(exam.audio_url, 0, "audio");
      await supabase
        .from("full_tests")
        .update({ audio_url: finalMainAudio })
        .eq("id", testId);
      console.log(`✅ Main audio linked: ${finalMainAudio}`);
    }

    const questionsArray = exam.questions || [];
    const totalQs = questionsArray.length;
    console.log(`📝 Preparing ${totalQs} questions...`);

    const parsedQuestions = [];

    // First download/upload all media files
    for (let i = 0; i < totalQs; i++) {
      const q = questionsArray[i];
      const part = q.part || q.part_number || 5;
      const quizId = quizMap[part];

      if (!quizId) continue;

      const currentStep = i + 1;
      if (currentStep % 25 === 0 || currentStep === totalQs) {
        console.log(`⏳ Processing media: ${currentStep}/${totalQs}...`);
      }

      const finalAudioUrl = q.audio_url ? await uploadMedia(q.audio_url, currentStep, "audio") : null;
      const finalImageUrl = q.image_url ? await uploadMedia(q.image_url, currentStep, "image") : null;

      let questionText = q.question_text || "";
      if (q.passage_text) {
        questionText = `[PASSAGE]${q.passage_text}[ENDPASSAGE]${questionText}`;
      }

      parsedQuestions.push({
        quiz_id: quizId,
        question_text: questionText,
        question_type: `part${part}`,
        display_order: q.display_order || currentStep,
        translation: q.translation || q.translation_text || null,
        audio_url: finalAudioUrl,
        image_url: finalImageUrl,
        group_id: q.group_id ? String(q.group_id) : null,
        transcript: q.transcript || null,
        answers: q.answers || [],
      });
    }

    // Bulk insert questions in chunks of 50
    console.log("💾 Inserting questions into database...");
    const insertedQs = [];
    for (let i = 0; i < parsedQuestions.length; i += 50) {
      const chunk = parsedQuestions.slice(i, i + 50);
      const { data: inserted, error: qInsertErr } = await supabase
        .from("questions")
        .insert(
          chunk.map((pq) => ({
            quiz_id: pq.quiz_id,
            question_text: pq.question_text,
            question_type: pq.question_type,
            display_order: pq.display_order,
            translation: pq.translation,
            audio_url: pq.audio_url,
            image_url: pq.image_url,
            group_id: pq.group_id,
            transcript: pq.transcript,
          }))
        )
        .select("id");

      if (qInsertErr) {
        console.error("Error inserting questions:", qInsertErr);
        continue;
      }
      if (inserted) insertedQs.push(...inserted);
    }

    console.log(`✅ Successfully inserted ${insertedQs.length} questions.`);

    // Bulk insert answers
    console.log("💾 Inserting answers into database...");
    const allAnswers = [];
    parsedQuestions.forEach((pq, idx) => {
      const questionId = insertedQs[idx]?.id;
      if (!questionId) return;

      pq.answers.forEach((ans, aIdx) => {
        allAnswers.push({
          question_id: questionId,
          answer_text: ans.answer_text || ans.text || "",
          is_correct: !!ans.is_correct || !!ans.correct,
          explanation: ans.explanation || null,
          display_order: ans.display_order !== undefined ? ans.display_order : aIdx,
        });
      });
    });

    for (let i = 0; i < allAnswers.length; i += 100) {
      const chunk = allAnswers.slice(i, i + 100);
      const { error: ansInsertErr } = await supabase.from("answers").insert(chunk);
      if (ansInsertErr) {
        console.error("Error inserting answers:", ansInsertErr);
      }
    }
    console.log(`✅ Successfully inserted ${allAnswers.length} answers.`);

    // Update quiz total_questions count
    console.log("🔄 Updating total questions counts for quizzes...");
    for (const part of Object.keys(quizMap)) {
      const partNum = Number(part);
      const quizId = quizMap[partNum];

      const { count, error: countErr } = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("quiz_id", quizId);

      if (countErr) {
        console.error(`Error counting questions for quiz ${quizId}:`, countErr);
        continue;
      }

      const { error: updateErr } = await supabase
        .from("quizzes")
        .update({ total_questions: count || 0 })
        .eq("id", quizId);

      if (updateErr) {
        console.error(`Error updating total_questions for quiz ${quizId}:`, updateErr);
      } else {
        console.log(`  - Part ${partNum} Quiz (ID: ${quizId}): ${count || 0} questions.`);
      }
    }
    console.log(`🎉 [Exam ${exIdx + 1}/${totalExams}] Completed successfully!`);
  }

  console.log("\n⭐️⭐️⭐️ All Consolidated Course Imports Finished! ⭐️⭐️⭐️\n");
}

main().catch(console.error);
