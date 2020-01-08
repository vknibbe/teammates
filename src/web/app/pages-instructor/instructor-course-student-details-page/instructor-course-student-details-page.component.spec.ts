import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Component, Input } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material';
import { RouterTestingModule } from '@angular/router/testing';
import { JoinState, Student } from '../../../types/api-output';
import { Gender } from '../../../types/gender';
import { StudentProfile } from '../student-profile/student-profile';
import {
  InstructorCourseStudentDetailsPageComponent,
} from './instructor-course-student-details-page.component';

@Component({ selector: 'tm-student-profile', template: '' })
class StudentProfileStubComponent {
  @Input() studentProfile: StudentProfile | undefined;
  @Input() studentName: string = '';
  @Input() photoUrl: string = '/assets/images/profile_picture_default.png';
  @Input() hideMoreInfo: boolean = false;
}
@Component({ selector: 'tm-course-related-info', template: '' })
class CourseRelatedInfoStubComponent {
  @Input() student: Student = {
    email: '',
    courseId: '',
    name: '',
    lastName: '',
    comments: '',
    teamName: '',
    sectionName: '',
    joinState: JoinState.JOINED,
  };
}
@Component({ selector: 'tm-more-info', template: '' })
class MoreInfoStubComponent {
  @Input() studentName: string = '';
  @Input() moreInfoText: string = '';
}

describe('InstructorCourseStudentDetailsPageComponent', () => {
  let component: InstructorCourseStudentDetailsPageComponent;
  let fixture: ComponentFixture<InstructorCourseStudentDetailsPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        InstructorCourseStudentDetailsPageComponent,
        StudentProfileStubComponent,
        CourseRelatedInfoStubComponent,
        MoreInfoStubComponent,
      ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        MatSnackBarModule,
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InstructorCourseStudentDetailsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should snap with default fields', () => {
    expect(fixture).toMatchSnapshot();
  });

  it('should snap with populated student', () => {
    component.student = {
      email: 'studentEmail@email.com',
      courseId: 'CS3281',
      name: 'firstName',
      lastName: 'lastName',
      comments: 'This is a comment',
      teamName: 'myTeam',
      sectionName: 'mySection',
      joinState: JoinState.JOINED,
    };
    component.studentProfile = {
      name: 'name',
      shortName: 'shortName',
      email: 'profileEmail@email.com',
      institute: 'NUS',
      nationality: 'Indian',
      gender: Gender.MALE,
      moreInfo: 'I have more info here',
    };
    fixture.detectChanges();
    expect(fixture).toMatchSnapshot();
  });
});
