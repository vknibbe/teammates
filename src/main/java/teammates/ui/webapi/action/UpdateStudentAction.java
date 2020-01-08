package teammates.ui.webapi.action;

import java.util.Arrays;

import org.apache.http.HttpStatus;

import teammates.common.datatransfer.attributes.InstructorAttributes;
import teammates.common.datatransfer.attributes.StudentAttributes;
import teammates.common.exception.EnrollException;
import teammates.common.exception.EntityAlreadyExistsException;
import teammates.common.exception.EntityDoesNotExistException;
import teammates.common.exception.InvalidParametersException;
import teammates.common.exception.UnauthorizedAccessException;
import teammates.common.util.Const;
import teammates.common.util.EmailSendingStatus;
import teammates.common.util.EmailWrapper;
import teammates.logic.api.EmailGenerator;
import teammates.ui.webapi.request.StudentUpdateRequest;

/**
 * Action: Edits details of a student in a course.
 */
public class UpdateStudentAction extends Action {
    private static final String SUCCESSFUL_UPDATE = "Student has been updated";
    private static final String SUCCESSFUL_UPDATE_WITH_EMAIL = SUCCESSFUL_UPDATE + " and email sent";
    private static final String SUCCESSFUL_UPDATE_BUT_EMAIL_FAILED = SUCCESSFUL_UPDATE + " but email failed to send";

    @Override
    protected AuthType getMinAuthLevel() {
        return authType.LOGGED_IN;
    }

    @Override
    public void checkSpecificAccessControl() {
        if (!userInfo.isInstructor) {
            throw new UnauthorizedAccessException("Instructor privilege is required to access this resource.");
        }
        String courseId = getNonNullRequestParamValue(Const.ParamsNames.COURSE_ID);

        InstructorAttributes instructor = logic.getInstructorForGoogleId(courseId, userInfo.id);
        gateKeeper.verifyAccessible(
                instructor, logic.getCourse(courseId), Const.ParamsNames.INSTRUCTOR_PERMISSION_MODIFY_STUDENT);
    }

    @Override
    public ActionResult execute() {
        String courseId = getNonNullRequestParamValue(Const.ParamsNames.COURSE_ID);
        String studentEmail = getNonNullRequestParamValue(Const.ParamsNames.STUDENT_EMAIL);

        StudentAttributes student = logic.getStudentForEmail(courseId, studentEmail);
        if (student == null) {
            return new JsonResult(Const.StatusMessages.STUDENT_NOT_FOUND_FOR_EDIT, HttpStatus.SC_NOT_FOUND);
        }

        StudentUpdateRequest updateRequest = getAndValidateRequestBody(StudentUpdateRequest.class);
        StudentAttributes studentToUpdate = StudentAttributes.builder(courseId, updateRequest.getEmail())
                .withName(updateRequest.getName())
                .withSectionName(updateRequest.getSection())
                .withTeamName(updateRequest.getTeam())
                .withComment(updateRequest.getComments())
                .build();

        boolean emailSent = false;

        try {
            logic.validateSectionsAndTeams(Arrays.asList(studentToUpdate), student.course);
            logic.updateStudentCascade(
                    StudentAttributes.updateOptionsBuilder(courseId, studentEmail)
                            .withName(updateRequest.getName())
                            .withNewEmail(updateRequest.getEmail())
                            .withTeamName(updateRequest.getTeam())
                            .withSectionName(updateRequest.getSection())
                            .withComment(updateRequest.getComments())
                            .build());

            if (!student.email.equals(updateRequest.getEmail())) {
                logic.resetStudentGoogleId(updateRequest.getEmail(), courseId);

                if (updateRequest.getIsSessionSummarySendEmail()) {
                    emailSent = sendEmail(courseId, updateRequest.getEmail());
                    String statusMessage = emailSent ? SUCCESSFUL_UPDATE_WITH_EMAIL
                            : SUCCESSFUL_UPDATE_BUT_EMAIL_FAILED;
                    return new JsonResult(statusMessage);
                }
            }
        } catch (EnrollException | InvalidParametersException e) {
            return new JsonResult(e.getMessage(), HttpStatus.SC_INTERNAL_SERVER_ERROR);
        } catch (EntityDoesNotExistException ednee) {
            return new JsonResult(ednee.getMessage(), HttpStatus.SC_NOT_FOUND);
        } catch (EntityAlreadyExistsException e) {
            return new JsonResult("Trying to update to an email that is already in use",
                    HttpStatus.SC_CONFLICT);
        }

        return new JsonResult(SUCCESSFUL_UPDATE);
    }

    /**
     * Sends the feedback session summary as an email.
     *
     * @return The true if email was sent successfully or false otherwise.
     */
    private boolean sendEmail(String courseId, String studentEmail) {
        EmailWrapper email =
                new EmailGenerator().generateFeedbackSessionSummaryOfCourse(courseId, studentEmail);
        EmailSendingStatus status = emailSender.sendEmail(email);
        return status.isSuccess();
    }
}
