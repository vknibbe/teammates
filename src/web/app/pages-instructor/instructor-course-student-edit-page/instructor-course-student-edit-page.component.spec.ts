import { HttpClientTestingModule } from '@angular/common/http/testing';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material';
import { RouterTestingModule } from '@angular/router/testing';
import { JoinState } from '../../../types/api-output';
import { InstructorCourseStudentEditPageComponent } from './instructor-course-student-edit-page.component';

describe('InstructorCourseStudentEditPageComponent', () => {
  let component: InstructorCourseStudentEditPageComponent;
  let fixture: ComponentFixture<InstructorCourseStudentEditPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [InstructorCourseStudentEditPageComponent],
      imports: [
        RouterTestingModule,
        ReactiveFormsModule,
        HttpClientTestingModule,
        MatSnackBarModule,
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InstructorCourseStudentEditPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should snap with default fields', () => {
    expect(fixture).toMatchSnapshot();
  });

  it('should snap with student details', () => {
    component.student = {
      email: 'jake@gmail.com',
      courseId: 'Crime101',
      name: 'Jake Peralta',
      lastName: 'Santiago',
      comments: 'Cool cool cool.',
      teamName: 'Team A',
      sectionName: 'Section A',
      joinState: JoinState.JOINED,
    };
    component.editForm = new FormGroup({
      studentname: new FormControl('Jake Peralta'),
      sectionname: new FormControl('Section A'),
      teamname: new FormControl('Team A'),
      newstudentemail: new FormControl('jake@gmail.com'),
      comments: new FormControl('Cool cool cool.'),
    });
    fixture.detectChanges();
    expect(fixture).toMatchSnapshot();
  });
});
