-- SEED DATA FOR TOEIC FULL COURSE (PART 1 - 7)

DO $$
DECLARE
    new_course_id INT;
    p1_mod_id INT; p2_mod_id INT; p3_mod_id INT; p4_mod_id INT; p5_mod_id INT; p6_mod_id INT; p7_mod_id INT;
    q_id INT;
    quest_id INT;
BEGIN
    -- 1. Create Course
    INSERT INTO courses (title, subtitle, course_type, description, is_active, display_order)
    VALUES ('Luyện thi TOEIC Toàn diện', 'Khóa học mẫu đầy đủ 7 Parts', 'toeic', 'Khóa học hướng dẫn và thực hành đầy đủ cấu trúc 7 phần của đề thi TOEIC mới nhất.', true, 0)
    RETURNING id INTO new_course_id;

    -- 2. Create Modules for each Part
    INSERT INTO modules (course_id, title, display_order) VALUES (new_course_id, 'Part 1: Photographs', 1) RETURNING id INTO p1_mod_id;
    INSERT INTO modules (course_id, title, display_order) VALUES (new_course_id, 'Part 2: Question - Response', 2) RETURNING id INTO p2_mod_id;
    INSERT INTO modules (course_id, title, display_order) VALUES (new_course_id, 'Part 3: Short Conversations', 3) RETURNING id INTO p3_mod_id;
    INSERT INTO modules (course_id, title, display_order) VALUES (new_course_id, 'Part 4: Short Talks', 4) RETURNING id INTO p4_mod_id;
    INSERT INTO modules (course_id, title, display_order) VALUES (new_course_id, 'Part 5: Incomplete Sentences', 5) RETURNING id INTO p5_mod_id;
    INSERT INTO modules (course_id, title, display_order) VALUES (new_course_id, 'Part 6: Text Completion', 6) RETURNING id INTO p6_mod_id;
    INSERT INTO modules (course_id, title, display_order) VALUES (new_course_id, 'Part 7: Reading Comprehension', 7) RETURNING id INTO p7_mod_id;

    -- 3. Seed Part 1
    INSERT INTO quizzes (module_id, title, total_questions, display_order) VALUES (p1_mod_id, 'Thực hành Part 1', 1, 0) RETURNING id INTO q_id;
    INSERT INTO questions (quiz_id, question_text, question_type, display_order, image_url, audio_url)
    VALUES (q_id, '', 'part1', 0, 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3') RETURNING id INTO quest_id;
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'A man is working on a laptop.', true, 0);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'A man is drinking coffee.', false, 1);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'A man is reading a book.', false, 2);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'A man is sleeping.', false, 3);

    -- 4. Seed Part 2
    INSERT INTO quizzes (module_id, title, total_questions, display_order) VALUES (p2_mod_id, 'Thực hành Part 2', 1, 0) RETURNING id INTO q_id;
    INSERT INTO questions (quiz_id, question_text, question_type, display_order, audio_url)
    VALUES (q_id, 'Where is the nearest post office?', 'part2', 0, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3') RETURNING id INTO quest_id;
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'It is next to the bank.', true, 0);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'At 5 PM.', false, 1);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'By bus.', false, 2);

    -- 5. Seed Part 3 (Grouped Questions)
    INSERT INTO quizzes (module_id, title, total_questions, display_order) VALUES (p3_mod_id, 'Thực hành Part 3', 3, 0) RETURNING id INTO q_id;
    -- Question 1 of Group
    INSERT INTO questions (quiz_id, question_text, question_type, display_order, audio_url)
    VALUES (q_id, 'What are the speakers discussing?', 'part3', 0, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3') RETURNING id INTO quest_id;
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'A new marketing campaign.', true, 0);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'An upcoming holiday.', false, 1);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'A job interview.', false, 2);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'A budget report.', false, 3);
    -- Question 2 of Group (Same Audio)
    INSERT INTO questions (quiz_id, question_text, question_type, display_order, audio_url)
    VALUES (q_id, 'Who is the woman?', 'part3', 1, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3') RETURNING id INTO quest_id;
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'A project manager.', true, 0);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'A client.', false, 1);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'A receptionist.', false, 2);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'A technician.', false, 3);

    -- 6. Seed Part 5
    INSERT INTO quizzes (module_id, title, total_questions, display_order) VALUES (p5_mod_id, 'Thực hành Part 5', 1, 0) RETURNING id INTO q_id;
    INSERT INTO questions (quiz_id, question_text, question_type, display_order)
    VALUES (q_id, 'The manager was impressed by the _______ performance of the team.', 'multiple_choice', 0) RETURNING id INTO quest_id;
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'exceptional', true, 0);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'exception', false, 1);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'except', false, 2);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'exceptionally', false, 3);

    -- 7. Seed Part 6 (Passage)
    INSERT INTO quizzes (module_id, title, total_questions, display_order) VALUES (p6_mod_id, 'Thực hành Part 6', 2, 0) RETURNING id INTO q_id;
    -- Question 15 with Passage
    INSERT INTO questions (quiz_id, question_text, question_type, display_order)
    VALUES (q_id, '[PASSAGE]Memo to all staff:\nAs of next Monday, the new parking regulations will come into effect. Please ensure you have your permits (15) ______ on your windshield. (16) ______ who fail to do so may be fined.[/ENDPASSAGE]Question 15', 'part6', 0) RETURNING id INTO quest_id;
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'displayed', true, 0);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'displaying', false, 1);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'displays', false, 2);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'to display', false, 3);
    -- Question 16 (No Passage prefix)
    INSERT INTO questions (quiz_id, question_text, question_type, display_order)
    VALUES (q_id, 'Question 16', 'part6', 1) RETURNING id INTO quest_id;
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'Those', true, 0);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'Them', false, 1);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'That', false, 2);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, 'These', false, 3);

    -- 8. Seed Part 7 (Reading)
    INSERT INTO quizzes (module_id, title, total_questions, display_order) VALUES (p7_mod_id, 'Thực hành Part 7', 1, 0) RETURNING id INTO q_id;
    INSERT INTO questions (quiz_id, question_text, question_type, display_order)
    VALUES (q_id, '[PASSAGE]Dear Mr. Henderson,\nThank you for choosing Grand Hotel for your stay. We are pleased to confirm your reservation for a deluxe room from June 12 to June 15. Your confirmation number is GH-9872. We look forward to seeing you soon.\nSincerely,\nGrand Hotel Management[/ENDPASSAGE]How long will Mr. Henderson stay at the hotel?', 'part7', 0) RETURNING id INTO quest_id;
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, '3 days', true, 0);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, '4 days', false, 1);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, '2 days', false, 2);
    INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES (quest_id, '5 days', false, 3);

    RAISE NOTICE 'Seed completed successfully for course ID %', new_course_id;
END $$;
