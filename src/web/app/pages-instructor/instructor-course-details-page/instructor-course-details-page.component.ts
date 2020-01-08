import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { saveAs } from 'file-saver';
import { ClipboardService } from 'ngx-clipboard';
import { CourseService } from '../../../services/course.service';
import { HttpRequestService } from '../../../services/http-request.service';
import { NavigationService } from '../../../services/navigation.service';
import { StatusMessageService } from '../../../services/status-message.service';
import { StudentService } from '../../../services/student.service';
import {
  Course,
  Instructor,
  InstructorPrivilege,
  Instructors,
  MessageOutput,
  Student,
  Students,
} from '../../../types/api-output';
import { ErrorMessageOutput } from '../../error-message-output';
import { Intent } from '../../Intent';
import { StudentListSectionData, StudentListStudentData } from '../student-list/student-list-section-data';

interface CourseStats {
  sectionsTotal: number;
  teamsTotal: number;
  studentsTotal: number;
}

interface CourseDetailsBundle {
  course: Course;
  stats: CourseStats;
}

interface StudentIndexedData {
  [key: string]: Student[];
}

/**
 * Instructor course details page.
 */
@Component({
  selector: 'tm-instructor-course-details-page',
  templateUrl: './instructor-course-details-page.component.html',
  styleUrls: ['./instructor-course-details-page.component.scss'],
})
export class InstructorCourseDetailsPageComponent implements OnInit {

  courseDetails: CourseDetailsBundle = {
    course: {
      courseId: '',
      courseName: '',
      timeZone: '',
      creationTimestamp: 0,
      deletionTimestamp: 0,
    },
    stats: {
      sectionsTotal: 0,
      teamsTotal: 0,
      studentsTotal: 0,
    },
  };
  instructors: Instructor[] = [];
  sections: StudentListSectionData[] = [];
  courseStudentListAsCsv: string = '';

  loading: boolean = false;
  isAjaxSuccess: boolean = true;

  constructor(private route: ActivatedRoute, private router: Router,
              private clipboardService: ClipboardService,
              private httpRequestService: HttpRequestService,
              private statusMessageService: StatusMessageService,
              private courseService: CourseService,
              private ngbModal: NgbModal, private navigationService: NavigationService,
              private studentService: StudentService) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe((queryParams: any) => {
      this.loadCourseDetails(queryParams.courseid);
    });
  }

  /**
   * Loads the course's details based on the given course ID.
   */
  loadCourseDetails(courseid: string): void {
    this.loadCourseName(courseid);
    this.loadInstructors(courseid);
    this.loadStudents(courseid);
  }

  /**
   * Loads the name of the course
   */
  private loadCourseName(courseid: string): void {
    this.courseService.getCourseAsInstructor(courseid).subscribe((course: Course) => {
      this.courseDetails.course = course;
    }, (resp: ErrorMessageOutput) => {
      this.statusMessageService.showErrorMessage(resp.error.message);
    });
  }

  /**
   * Loads the instructors in the course
   */
  private loadInstructors(courseid: string): void {
    const paramMap: any = { courseid, intent: Intent.FULL_DETAIL };
    this.httpRequestService.get('/instructors', paramMap).subscribe((instructors: Instructors) => {
      this.instructors = instructors.instructors;
    }, (resp: ErrorMessageOutput) => {
      this.statusMessageService.showErrorMessage(resp.error.message);
    });
  }

  /**
   * Loads the students in the course
   */
  private loadStudents(courseid: string): void {
    this.studentService.getStudentsFromCourse(courseid).subscribe((students: Students) => {
      const sections: StudentIndexedData = students.students.reduce((acc: StudentIndexedData, x: Student) => {
        const term: string = x.sectionName;
        (acc[term] = acc[term] || []).push(x);
        return acc;
      }, {});

      const teams: Set<string> = new Set();
      students.students.forEach((student: Student) => teams.add(student.teamName));

      this.courseDetails.stats = {
        sectionsTotal: Object.keys(sections).length,
        teamsTotal: teams.size,
        studentsTotal: students.students.length,
      };

      Object.keys(sections).forEach((key: string) => {
        const studentsInSection: Student[] = sections[key];

        const data: StudentListStudentData[] = [];
        studentsInSection.forEach((student: Student) => {
          const studentData: StudentListStudentData = {
            name: student.name,
            status: student.joinState,
            email: student.email,
            team: student.teamName,
          };
          data.push(studentData);
        });

        this.loadPrivilege(courseid, key, data);
      });
    }, (resp: ErrorMessageOutput) => {
      this.statusMessageService.showErrorMessage(resp.error.message);
    });
  }

  /**
   * Loads privilege of an instructor for a specified course and section.
   */
  private loadPrivilege(courseid: string, sectionName: string, students: StudentListStudentData[]): void {
    this.httpRequestService.get('/instructor/privilege', {
      courseid,
      sectionname: sectionName,
    }).subscribe((instructorPrivilege: InstructorPrivilege) => {
      const sectionData: StudentListSectionData = {
        sectionName,
        students,
        isAllowedToViewStudentInSection : instructorPrivilege.canViewStudentInSections,
        isAllowedToModifyStudent : instructorPrivilege.canModifyStudent,
      };

      this.sections.push(sectionData);
    }, (resp: ErrorMessageOutput) => {
      this.statusMessageService.showErrorMessage(resp.error.message);
    });
  }

  /**
   * Automatically copy the text content provided.
   */
  copyContent(text: string): void {
    this.clipboardService.copyFromContent(text);
  }

  /**
   * Open the modal for different buttons and link.
   */
  openModal(content: any): void {
    this.ngbModal.open(content);
  }

  /**
   * Delete all the students in a course.
   */
  deleteAllStudentsFromCourse(courseId: string): void {
    const paramsMap: { [key: string]: string } = {
      courseid: courseId,
    };
    this.httpRequestService.delete('/students', paramsMap)
      .subscribe((resp: MessageOutput) => {
        this.loadCourseDetails(courseId);
        this.statusMessageService.showSuccessMessage(resp.message);
      }, (resp: ErrorMessageOutput) => {
        this.statusMessageService.showErrorMessage(resp.error.message);
      });
  }

  /**
   * Download all the students from a course.
   */
  downloadAllStudentsFromCourse(courseId: string): void {
    const filename: string = `${courseId.concat('_studentList')}.csv`;
    let blob: any;

    // Calling REST API only the first time to load the downloadable data
    if (this.loading) {
      blob = new Blob([this.courseStudentListAsCsv], { type: 'text/csv' });
      saveAs(blob, filename);
    } else {

      const paramsMap: { [key: string]: string } = {
        courseid: courseId,
      };
      this.httpRequestService.get('/students/csv', paramsMap, 'text')
        .subscribe((resp: string) => {
          blob = new Blob([resp], { type: 'text/csv' });
          saveAs(blob, filename);
          this.courseStudentListAsCsv = resp;
          this.loading = false;
        }, (resp: ErrorMessageOutput) => {
          this.statusMessageService.showErrorMessage(resp.error.message);
        });
    }
  }

  /**
   * Load the student list in csv table format
   */
  loadStudentsListCsv(courseId: string): void {
    this.loading = true;

    // Calls the REST API once only when student list is not loaded
    if (this.courseStudentListAsCsv !== '') {
      this.loading = false;
      return;
    }

    const paramsMap: { [key: string]: string } = {
      courseid: courseId,
    };
    this.httpRequestService.get('/students/csv', paramsMap, 'text')
      .subscribe((resp: string) => {
        this.courseStudentListAsCsv = resp;
      }, (resp: ErrorMessageOutput) => {
        this.statusMessageService.showErrorMessage(resp.error.message);
        this.isAjaxSuccess = false;
      });
    this.loading = false;
  }

  /**
   * Remind all yet to join students in a course.
   */
  remindAllStudentsFromCourse(courseId: string): void {
    this.courseService.remindUnregisteredStudentsForJoin(courseId).subscribe((resp: MessageOutput) => {
      this.navigationService.navigateWithSuccessMessagePreservingParams(this.router,
        '/web/instructor/courses/details', resp.message);
    }, (resp: ErrorMessageOutput) => {
      this.statusMessageService.showErrorMessage(resp.error.message);
    });
  }

  /**
   * Converts a csv string to a html table string for displaying.
   */
  convertToHtmlTable(str: string): string {
    let result: string = '<table class=\"table table-bordered table-striped table-sm\">';
    let rowData: string[];
    const lines: string[] = str.split(/\r?\n/);

    lines.forEach(
        (line: string) => {
          rowData = this.getTableData(line);

          if (rowData.filter((s: string) => s !== '').length === 0) {
            return;
          }
          result = result.concat('<tr>');
          for (const td of rowData) {
            result = result.concat(`<td>${td}</td>`);
          }
          result = result.concat('</tr>');
        },
    );
    return result.concat('</table>');
  }

  /**
   * Obtain a string without quotations.
   */
  getTableData(line: string): string[] {
    const output: string[] = [];
    let inquote: boolean = false;

    let buffer: string = '';
    const data: string[] = line.split('');

    for (let i: number = 0; i < data.length; i += 1) {
      if (data[i] === '"') {
        if (i + 1 < data.length && data[i + 1] === '"') {
          i += 1;
        } else {
          inquote = !inquote;
          continue;
        }
      }

      if (data[i] === ',') {
        if (inquote) {
          buffer = buffer.concat(data[i]);
        } else {
          output.push(buffer);
          buffer = '';
        }
      } else {
        buffer = buffer.concat(data[i]);
      }
    }
    output.push(buffer.trim());
    return output;
  }
}
