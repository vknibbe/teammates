import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { StatusMessageService } from '../../../services/status-message.service';
import { StudentProfileService } from '../../../services/student-profile.service';
import { StudentService } from '../../../services/student.service';
import { Student, StudentProfile } from '../../../types/api-output';
import { ErrorMessageOutput } from '../../error-message-output';

/**
 * Instructor course student details page.
 */
@Component({
  selector: 'tm-instructor-course-student-details-page',
  templateUrl: './instructor-course-student-details-page.component.html',
  styleUrls: ['./instructor-course-student-details-page.component.scss'],
})
export class InstructorCourseStudentDetailsPageComponent implements OnInit {

  student?: Student;
  studentProfile?: StudentProfile;
  photoUrl: string = '';

  constructor(private route: ActivatedRoute,
              private statusMessageService: StatusMessageService,
              private studentService: StudentService,
              private studentProfileService: StudentProfileService) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe((queryParams: any) => {
      const courseId: string = queryParams.courseid;
      const studentEmail: string = queryParams.studentemail;

      this.loadStudentDetails(courseId, studentEmail);
      this.photoUrl
          = `${environment.backendUrl}/webapi/student/profilePic?courseid=${courseId}&studentemail=${studentEmail}`;
    });
  }

  /**
   * Loads the student's details based on the given course ID and email.
   */
  loadStudentDetails(courseId: string, studentEmail: string): void {
    this.studentProfileService.getStudentProfile(studentEmail, courseId).subscribe((studentProfile: StudentProfile) => {
      this.studentProfile = studentProfile;
    }, (resp: ErrorMessageOutput) => {
      this.statusMessageService.showErrorMessage(resp.error.message);
    });
    this.studentService.getStudent(courseId, studentEmail).subscribe((student: Student) => {
      this.student = student;
    }, (resp: ErrorMessageOutput) => {
      this.statusMessageService.showErrorMessage(resp.error.message);
    });
  }
}
