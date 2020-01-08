import { Component, ContentChild, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { HotTableRegisterer } from '@handsontable/angular';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Handsontable from 'handsontable';
import { CourseService } from '../../../services/course.service';
import { HttpRequestService } from '../../../services/http-request.service';
import { StatusMessageService } from '../../../services/status-message.service';
import { StudentService } from '../../../services/student.service';
import { HasResponses, JoinState, Student, Students } from '../../../types/api-output';
import { StudentEnrollRequest, StudentsEnrollRequest } from '../../../types/api-request';
import { StatusMessage } from '../../components/status-message/status-message';
import { ErrorMessageOutput } from '../../error-message-output';
import { EnrollStatus } from './enroll-status';

interface StudentAttributes {
  email: string;
  course: string;
  name: string;
  lastName: string;
  comments: string;
  team: string;
  section: string;
}

interface EnrollResultPanel {
  status: EnrollStatus;
  messageForEnrollmentStatus: string;
  studentList: Student[];
}

interface StudentListResults {
  enrolledStudents: StudentAttributes[];
}

/**
 * Instructor course enroll page.
 */
@Component({
  selector: 'tm-instructor-course-enroll-page',
  templateUrl: './instructor-course-enroll-page.component.html',
  styleUrls: ['./instructor-course-enroll-page.component.scss'],
})
export class InstructorCourseEnrollPageComponent implements OnInit {

  // enum
  EnrollStatus: typeof EnrollStatus = EnrollStatus;
  courseid: string = '';
  coursePresent?: boolean;
  showEnrollResults?: boolean = false;
  statusMessage: StatusMessage[] = [];

  @ViewChild('moreInfo') moreInfo?: ElementRef;
  @ContentChild('pasteModalBox') pasteModalBox?: NgbModal;

  @Input() isNewStudentsPanelCollapsed: boolean = false;
  @Input() isExistingStudentsPanelCollapsed: boolean = true;

  colHeaders: string[] = ['Section', 'Team', 'Name', 'Email', 'Comments'];
  contextMenuOptions: String[] | Object[] =
    ['row_above',
      'row_below',
      'remove_row',
      'undo',
      'redo',
      {
        key: 'paste',
        name: 'Paste',
        callback: this.pasteClick,
      },
      'make_read_only',
      'alignment'];

  hotRegisterer: HotTableRegisterer = new HotTableRegisterer();
  newStudentsHOT: string = 'newStudentsHOT';

  enrollResultPanelList?: EnrollResultPanel[];
  existingStudents: Student[] = [];

  existingStudentsHOT: string = 'existingStudentsHOT';
  isExistingStudentsPresent: boolean = true;
  loading: boolean = false;
  isAjaxSuccess: boolean = true;

  constructor(private route: ActivatedRoute,
              private httpRequestService: HttpRequestService,
              private statusMessageService: StatusMessageService,
              private courseService: CourseService,
              private studentService: StudentService,
              private ngbModal: NgbModal) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe((queryParams: any) => {
      this.getCourseEnrollPageData(queryParams.courseid);
    });
  }

  /**
   * Submits enroll data
   */
  submitEnrollData(): void {
    const newStudentsHOTInstance: Handsontable =
        this.hotRegisterer.getInstance(this.newStudentsHOT);

    const hotInstanceColHeaders: string[] = (newStudentsHOTInstance.getColHeader() as string[]);

    const studentsEnrollRequest: StudentsEnrollRequest = {
      studentEnrollRequests: [],
    };

    // Parse the user input to be requests.
    // Handsontable contains null value initially,
    // see https://github.com/handsontable/handsontable/issues/3927
    newStudentsHOTInstance.getData()
        .filter((row: string[]) => (!row.every((cell: string) => cell === null || cell === '')))
        .forEach((row: string[]) => (studentsEnrollRequest.studentEnrollRequests.push({
          section: row[hotInstanceColHeaders.indexOf(this.colHeaders[0])] === null ?
              '' : row[hotInstanceColHeaders.indexOf(this.colHeaders[0])],
          team: row[hotInstanceColHeaders.indexOf(this.colHeaders[1])] === null ?
              '' : row[hotInstanceColHeaders.indexOf(this.colHeaders[1])],
          name: row[hotInstanceColHeaders.indexOf(this.colHeaders[2])] === null ?
              '' : row[hotInstanceColHeaders.indexOf(this.colHeaders[2])],
          email: row[hotInstanceColHeaders.indexOf(this.colHeaders[3])] === null ?
              '' : row[hotInstanceColHeaders.indexOf(this.colHeaders[3])],
          comments: row[hotInstanceColHeaders.indexOf(this.colHeaders[4])] === null ?
              '' : row[hotInstanceColHeaders.indexOf(this.colHeaders[4])],
        })));

    this.studentService.enrollStudents(this.courseid, studentsEnrollRequest).subscribe((resp: Students) => {
      const enrolledStudents: Student[] = resp.students;
      this.showEnrollResults = true;
      this.statusMessage.pop(); // removes any existing error status message
      this.statusMessageService.showSuccessMessage('Enrollment successful. Summary given below.');
      this.enrollResultPanelList =
          this.populateEnrollResultPanelList(this.existingStudents, enrolledStudents,
              studentsEnrollRequest.studentEnrollRequests);
    }, (resp: ErrorMessageOutput) => {
      this.statusMessage.pop(); // removes any existing error status message
      this.statusMessageService.showErrorMessage(resp.error.message);
    });
    this.studentService.getStudentsFromCourse(this.courseid).subscribe((resp: Students) => {
      this.existingStudents = resp.students;
    });
    this.isExistingStudentsPresent = true;
  }

  private populateEnrollResultPanelList(existingStudents: Student[], enrolledStudents: Student[],
                                         enrollRequests: StudentEnrollRequest[]): EnrollResultPanel[] {

    const panels: EnrollResultPanel[] = [];
    const studentLists: Student[][] = [];

    for (const _ of Object.values(EnrollStatus).filter((value: EnrollStatus) => typeof value === 'string')) {
      studentLists.push([]);
    }

    // Identify students not in the enroll list.
    for (const existingStudent of existingStudents) {
      const enrolledStudent: Student | undefined = enrolledStudents.find((student: Student) => {
        return student.email === existingStudent.email;
      });
      if (enrolledStudent === undefined) {
        studentLists[EnrollStatus.UNMODIFIED].push(existingStudent);
      }
    }

    // Identify new students, modified students, and students that are modified without any changes.
    for (const enrolledStudent of enrolledStudents) {
      const unchangedStudent: Student | undefined = existingStudents.find((student: Student) => {
        return this.isSameEnrollInformation(student, enrolledStudent);
      });
      const modifiedStudent: Student | undefined = existingStudents.find((student: Student) => {
        return student.email === enrolledStudent.email;
      });
      if (unchangedStudent !== undefined) {
        studentLists[EnrollStatus.MODIFIED_UNCHANGED].push(enrolledStudent);
      } else if (unchangedStudent === undefined && modifiedStudent !== undefined) {
        studentLists[EnrollStatus.MODIFIED].push(enrolledStudent);
      } else if (unchangedStudent === undefined && modifiedStudent === undefined) {
        studentLists[EnrollStatus.NEW].push(enrolledStudent);
      }
    }

    // Identify students that failed to enroll.
    for (const request of enrollRequests) {
      const enrolledStudent: Student | undefined = enrolledStudents.find((student: Student) => {
        return student.email === request.email;
      });

      if (enrolledStudent === undefined) {
        studentLists[EnrollStatus.ERROR].push({
          email: request.email,
          courseId: this.courseid,
          name: request.name,
          sectionName: request.section,
          teamName: request.team,
          comments: request.comments,
          joinState: JoinState.NOT_JOINED,
          lastName: '',
        });
      }
    }

    const statusMessage: { [key: number]: string } = {
      0: `${studentLists[EnrollStatus.NEW].length} student(s) added:`,
      1: `${studentLists[EnrollStatus.MODIFIED].length} student(s) modified:`,
      2: `${studentLists[EnrollStatus.MODIFIED_UNCHANGED].length} student(s) updated with no changes:`,
      3: `${studentLists[EnrollStatus.ERROR].length} student(s) failed to be enrolled:`,
      4: `${studentLists[EnrollStatus.UNMODIFIED].length} student(s) remain unmodified:`,
    };

    for (const status of Object.values(EnrollStatus).filter((value: EnrollStatus) => typeof value === 'string')) {
      panels.push({
        status: EnrollStatus[status as keyof typeof EnrollStatus],
        messageForEnrollmentStatus: statusMessage[EnrollStatus[status as keyof typeof EnrollStatus]],
        studentList: studentLists[EnrollStatus[status as keyof typeof EnrollStatus]],
      });
    }

    if (studentLists[EnrollStatus.ERROR].length > 0) {
      const generalEnrollErrorMessage: string = 'You may check that: ' +
          '"Section" and "Comment" are optional while "Team", "Name", and "Email" must be filled. ' +
          '"Section", "Team", "Name", and "Comment" should start with an alphabetical character, ' +
          'unless wrapped by curly brackets "{}", and should not contain vertical bar "|" and percentage sign"%". ' +
          '"Email" should contain some text followed by one \'@\' sign followed by some more text. ' +
          '"Team" should not have same format of email to avoid mis-interpretation. ';
      this.statusMessageService.showErrorMessage(`Some students failed to be enrolled, see the summary below.
       ${generalEnrollErrorMessage}`);
    }
    return panels;
  }

  private isSameEnrollInformation(enrolledStudent: Student, existingStudent: Student): boolean {
    return enrolledStudent.email === existingStudent.email
        && enrolledStudent.name === existingStudent.name
        && enrolledStudent.teamName === existingStudent.teamName
        && enrolledStudent.sectionName === existingStudent.sectionName
        && enrolledStudent.comments === existingStudent.comments;
  }

  /**
   * Adds new rows to the 'New students' spreadsheet interface
   * according to user input
   */
  addRows(numOfRows: number): void {
    this.hotRegisterer.getInstance(this.newStudentsHOT).alter(
        'insert_row', [], numOfRows);
  }

  /**
   * Toggles the view of 'New Students' spreadsheet interface
   * and/or its affiliated buttons
   */
  toggleNewStudentsPanel(): void {
    this.isNewStudentsPanelCollapsed = !this.isNewStudentsPanelCollapsed;
  }

  /**
   * Returns the length of the current spreadsheet.
   * Rows with all null values are filtered.
   */
  getSpreadsheetLength(dataHandsontable: string[][]): number {
    return dataHandsontable
        .filter((row: string[]) => (!row.every((cell: string) => cell === null)))
        .length;
  }

  /**
   * Transforms the first uppercase letter of a string into a lowercase letter.
   */
  unCapitalizeFirstLetter(targetString: string): string {
    return targetString.charAt(0).toLowerCase() + targetString.slice(1);
  }

  /**
   * Converts returned student list to a suitable format required by Handsontable.
   */
  studentListDataToHandsontableData(studentsData: StudentAttributes[], handsontableColHeader: any[]): string[][] {
    const headers: string[] = handsontableColHeader.map(this.unCapitalizeFirstLetter);
    return studentsData.map((student: StudentAttributes) => (headers.map(
        (header: string) => (student as any)[header])));
  }

  /**
   * Loads existing student data into the spreadsheet interface.
   */
  loadExistingStudentsData(existingStudentsHOTInstance: Handsontable, studentsData: StudentAttributes[]): void {
    existingStudentsHOTInstance.loadData(this.studentListDataToHandsontableData(
        studentsData, (existingStudentsHOTInstance.getColHeader() as any[])));
  }

  /**
   * Toggles the view of 'Existing Students' spreadsheet interface
   */
  toggleExistingStudentsPanel(): void {
    // Has to be done before the API call is made so that HOT is available for data population
    this.isExistingStudentsPanelCollapsed = !this.isExistingStudentsPanelCollapsed;
    this.loading = true;
    const existingStudentsHOTInstance: Handsontable =
        this.hotRegisterer.getInstance(this.existingStudentsHOT);

    // Calling REST API only the first time when spreadsheet has no data
    if (this.getSpreadsheetLength(existingStudentsHOTInstance.getData()) !== 0) {
      this.loading = false;
      return;
    }

    const paramMap: { [key: string]: string } = {
      courseid: this.courseid,
    };
    this.httpRequestService.get('/course/enroll/students', paramMap).subscribe(
        (resp: StudentListResults) => {
          if (resp.enrolledStudents.length !== 0) {
            this.loadExistingStudentsData(existingStudentsHOTInstance, resp.enrolledStudents);
          } else {
            // Shows a message if there are no existing students. Panel would not be expanded.
            this.isExistingStudentsPresent = false;
            this.isExistingStudentsPanelCollapsed = !this.isExistingStudentsPanelCollapsed; // Collapse the panel again
          }
        }, (resp: ErrorMessageOutput) => {
      this.statusMessageService.showErrorMessage(resp.error.message);
      this.isAjaxSuccess = false;
      this.isExistingStudentsPanelCollapsed = !this.isExistingStudentsPanelCollapsed; // Collapse the panel again
    });
    this.loading = false;
  }

  /**
   * Trigger click button
   */
  pasteClick(): void {
    const element: HTMLElement =
        (document.getElementById('paste') as HTMLElement);
    element.click();
  }

  /**
   * Shows modal box when user clicks on the 'paste' option in the
   * Handsontable context menu
   */
  showPasteModalBox(pasteModalBox: any): void {
    this.ngbModal.open(pasteModalBox);
  }

  /**
   * Reset page to default view
   */
  hideEnrollResults(): void {
    this.showEnrollResults = false;
    this.statusMessage.pop();
    window.scroll(0, 0);
  }

  /**
   * Checks whether the course is present
   */
  getCourseEnrollPageData(courseid: string): void {
    this.courseService.hasResponsesForCourse(courseid).subscribe((resp: HasResponses) => {
      this.coursePresent = true;
      this.courseid = courseid;
      if (resp.hasResponses) {
        this.statusMessageService.showWarningMessage('There are existing feedback responses for this course. '
            + 'Modifying records of enrolled students will result in some existing responses '
            + 'from those modified students to be deleted. You may wish to download the data '
            + 'before you make the changes.');
      }
    }, (resp: ErrorMessageOutput) => {
      this.coursePresent = false;
      this.statusMessageService.showErrorMessage(resp.error.message);
    });
    this.studentService.getStudentsFromCourse(courseid).subscribe((resp: Students) => {
      this.existingStudents = resp.students;
    });
  }

  /**
   * Shows user more information about the spreadsheet interfaces
   */
  navigateToMoreInfo(): void {
    (this.moreInfo as ElementRef)
        .nativeElement.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

}
