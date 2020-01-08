import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { HttpRequestService } from '../../../services/http-request.service';
import { StatusMessageService } from '../../../services/status-message.service';
import { JoinState, MessageOutput, Student } from '../../../types/api-output';
import { StudentUpdateRequest } from '../../../types/api-request';
import { ErrorMessageOutput } from '../../error-message-output';

import { StudentService } from '../../../services/student.service';
import { FormValidator } from '../../../types/form-validator';

/**
 * Instructor course student edit page.
 */
@Component({
  selector: 'tm-instructor-course-student-edit-page',
  templateUrl: './instructor-course-student-edit-page.component.html',
  styleUrls: ['./instructor-course-student-edit-page.component.scss'],
})
export class InstructorCourseStudentEditPageComponent implements OnInit, OnDestroy {

  @Input() isEnabled: boolean = true;
  courseId: string = '';
  student!: Student;

  isTeamnameFieldChanged: boolean = false;
  isEmailFieldChanged: boolean = false;

  editForm!: FormGroup;
  teamFieldSubscription?: Subscription;
  emailFieldSubscription?: Subscription;

  FormValidator: typeof FormValidator = FormValidator; // enum

  constructor(private route: ActivatedRoute,
              private router: Router,
              private httpRequestService: HttpRequestService,
              private statusMessageService: StatusMessageService,
              private studentService: StudentService,
              private ngbModal: NgbModal) { }

  ngOnInit(): void {
    if (!this.isEnabled) {
      this.student = {
        email: 'alice@email.com',
        courseId: '',
        name: 'Alice Betsy',
        lastName: '',
        comments: 'Alice is a transfer student.',
        teamName: 'Team A',
        sectionName: 'Section A',
        joinState: JoinState.JOINED,
      };
      this.initEditForm();
      return;
    }

    this.route.queryParams.subscribe((queryParams: any) => {
      this.courseId = queryParams.courseid;
      this.loadStudentEditDetails(queryParams.courseid, queryParams.studentemail);
    });
  }

  ngOnDestroy(): void {
    if (this.emailFieldSubscription) {
      (this.emailFieldSubscription as Subscription).unsubscribe();
    }
    if (this.teamFieldSubscription) {
      (this.teamFieldSubscription as Subscription).unsubscribe();
    }
  }

  /**
   * Loads student details required for this page.
   */
  loadStudentEditDetails(courseId: string, studentEmail: string): void {
    this.studentService.getStudent(courseId, studentEmail).subscribe((student: Student) => {
      this.student = student;
      this.initEditForm();
    }, (resp: ErrorMessageOutput) => {
      this.statusMessageService.showErrorMessage(resp.error.message);
    });
  }

  /**
   * Initializes the student details edit form with the fields fetched from the backend.
   * Subscriptions are set up to listen to changes in the 'teamname' fields and 'newstudentemail' fields.
   */
  private initEditForm(): void {
    this.editForm = new FormGroup({
      studentname: new FormControl(this.student.name,
          [Validators.required, Validators.maxLength(FormValidator.STUDENT_NAME_MAX_LENGTH)]),
      sectionname: new FormControl(this.student.sectionName,
          [Validators.required, Validators.maxLength(FormValidator.SECTION_NAME_MAX_LENGTH)]),
      teamname: new FormControl(this.student.teamName,
          [Validators.required, Validators.maxLength(FormValidator.TEAM_NAME_MAX_LENGTH)]),
      newstudentemail: new FormControl(this.student.email, // original student email initialized
          [Validators.required, Validators.maxLength(FormValidator.EMAIL_MAX_LENGTH)]),
      comments: new FormControl(this.student.comments),
    });
    this.teamFieldSubscription =
        (this.editForm.get('teamname') as AbstractControl).valueChanges
            .subscribe(() => {
              this.isTeamnameFieldChanged = true;
            });

    this.emailFieldSubscription =
        (this.editForm.get('newstudentemail') as AbstractControl).valueChanges
            .subscribe(() => this.isEmailFieldChanged = true);
  }

  /**
   * Displays message to user stating that the field is empty.
   */
  displayEmptyFieldMessage(fieldName: string): string {
    return `The field '${fieldName}' should not be empty.`;
  }

  /**
   * Displays message to user stating that the field exceeds the max length.
   */
  displayExceedMaxLengthMessage(fieldName: string, maxLength: number): string {
    return `The field '${fieldName}' should not exceed ${maxLength} characters.`;
  }

  /**
   * Handles logic related to showing the appropriate modal boxes
   * upon submission of the form. Submits the form otherwise.
   */
  onSubmit(confirmDelModal: any, resendPastLinksModal: any): void {
    if (!this.isEnabled) {
      return;
    }

    if (this.isTeamnameFieldChanged) {
      this.ngbModal.open(confirmDelModal);
    } else if (this.isEmailFieldChanged) {
      this.ngbModal.open(resendPastLinksModal);
    } else {
      this.submitEditForm(false);
    }
  }

  /**
   * Shows the `resendPastSessionLinks` modal if email field has changed.
   * Submits the form  otherwise.
   */
  deleteExistingResponses(resendPastLinksModal: any): void {
    if (this.isEmailFieldChanged) {
      this.ngbModal.open(resendPastLinksModal);
    } else {
      this.submitEditForm(false);
    }
  }

  /**
   * Submits the form data to edit the student details.
   */
  submitEditForm(shouldResendPastSessionLinks: boolean): void {
    // creates a new object instead of using its reference
    const paramsMap: { [key: string]: string } = {
      courseid: this.courseId,
      studentemail: this.student.email,
    };

    const reqBody: StudentUpdateRequest = {
      name: this.editForm.value.studentname,
      email: this.editForm.value.newstudentemail,
      team: this.editForm.value.teamname,
      section: this.editForm.value.sectionname,
      comments: this.editForm.value.comments,
      isSessionSummarySendEmail: shouldResendPastSessionLinks,
    };

    this.httpRequestService.put('/student', paramsMap, reqBody)
      .subscribe((resp: MessageOutput) => {
        this.router.navigate(['/web/instructor/courses/details'], {
          queryParams: { courseid: this.courseId },
        }).then(() => {
          this.statusMessageService.showSuccessMessage(resp.message);
        });
      }, (resp: ErrorMessageOutput) => {
        this.statusMessageService.showErrorMessage(resp.error.message);
      });
  }
}
