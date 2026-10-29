import { Injectable } from '@nestjs/common';
import { AdminMaterialDto } from './dto';
import type { MaterialWithCourse } from './materials.repository';

@Injectable()
export class MaterialsMapper {
  toAdminDto(m: MaterialWithCourse): AdminMaterialDto {
    return {
      id: m.id,
      lesson_id: m.lessonId,
      quiz_id: m.quizId,
      course_id: m.courseId,
      title: m.title,
      file_url: m.fileUrl,
      file_type: m.fileType,
      display_order: m.displayOrder,
      created_at: m.createdAt ? m.createdAt.toISOString() : null,
      folder_path: m.folderPath,
      courses: m.course ? { title: m.course.title } : null,
    };
  }
}
