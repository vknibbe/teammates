package teammates.common.datatransfer.attributes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import teammates.common.datatransfer.questions.FeedbackQuestionType;
import teammates.common.datatransfer.questions.FeedbackResponseDetails;
import teammates.common.datatransfer.questions.FeedbackTextResponseDetails;
import teammates.common.util.Assumption;
import teammates.common.util.Const;
import teammates.common.util.FieldValidator;
import teammates.common.util.JsonUtils;
import teammates.storage.entity.FeedbackResponse;

public class FeedbackResponseAttributes extends EntityAttributes<FeedbackResponse> {

    public String feedbackQuestionId;
    /**
    * Depending on the question giver type, {@code giver} may contain the giver's email, the team name,
    * "anonymous", etc.
    */
    public String giver;
    /**
     * Depending on the question recipient type, {@code recipient} may contain the recipient's email, the team
     * name, "%GENERAL%", etc.
     */
    public String recipient;

    public String feedbackSessionName;
    public String courseId;

    public FeedbackResponseDetails responseDetails;

    public String giverSection;
    public String recipientSection;

    protected transient Instant createdAt;
    protected transient Instant updatedAt;

    private String feedbackResponseId;

    FeedbackResponseAttributes(String feedbackQuestionId, String giver, String recipient) {
        this.feedbackQuestionId = feedbackQuestionId;
        this.giver = giver;
        this.recipient = recipient;

        this.giverSection = Const.DEFAULT_SECTION;
        this.recipientSection = Const.DEFAULT_SECTION;
    }

    public FeedbackResponseAttributes(FeedbackResponseAttributes copy) {
        this.feedbackResponseId = copy.getId();
        this.feedbackSessionName = copy.feedbackSessionName;
        this.courseId = copy.courseId;
        this.feedbackQuestionId = copy.feedbackQuestionId;
        this.giver = copy.giver;
        this.giverSection = copy.giverSection;
        this.recipient = copy.recipient;
        this.recipientSection = copy.recipientSection;
        this.createdAt = copy.createdAt;
        this.updatedAt = copy.updatedAt;
        this.responseDetails = copy.getResponseDetails();
    }

    public static FeedbackResponseAttributes valueOf(FeedbackResponse fr) {
        FeedbackResponseAttributes fra =
                new FeedbackResponseAttributes(
                        fr.getFeedbackQuestionId(), fr.getGiverEmail(), fr.getRecipientEmail());

        fra.feedbackResponseId = fr.getId();
        fra.feedbackSessionName = fr.getFeedbackSessionName();
        fra.courseId = fr.getCourseId();
        if (fr.getGiverSection() != null) {
            fra.giverSection = fr.getGiverSection();
        }
        if (fr.getRecipientSection() != null) {
            fra.recipientSection = fr.getRecipientSection();
        }
        fra.responseDetails =
                fra.deserializeResponseFromSerializedString(fr.getResponseMetaData(), fr.getFeedbackQuestionType());
        fra.createdAt = fr.getCreatedAt();
        fra.updatedAt = fr.getUpdatedAt();

        return fra;
    }

    public FeedbackQuestionType getFeedbackQuestionType() {
        return responseDetails.questionType;
    }

    public String getId() {
        return feedbackResponseId;
    }

    public void setId(String feedbackResponseId) {
        this.feedbackResponseId = feedbackResponseId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public String getFeedbackSessionName() {
        return feedbackSessionName;
    }

    public String getCourseId() {
        return courseId;
    }

    public String getFeedbackQuestionId() {
        return feedbackQuestionId;
    }

    public String getGiver() {
        return giver;
    }

    public String getRecipient() {
        return recipient;
    }

    public String getGiverSection() {
        return giverSection;
    }

    public String getRecipientSection() {
        return recipientSection;
    }

    @Override
    public List<String> getInvalidityInfo() {

        List<String> errors = new ArrayList<>();

        addNonEmptyError(FieldValidator.getInvalidityInfoForFeedbackSessionName(feedbackSessionName), errors);

        addNonEmptyError(FieldValidator.getInvalidityInfoForCourseId(courseId), errors);

        return errors;
    }

    @Override
    public boolean isValid() {
        return getInvalidityInfo().isEmpty();
    }

    @Override
    public FeedbackResponse toEntity() {
        return new FeedbackResponse(feedbackSessionName, courseId,
                feedbackQuestionId, getFeedbackQuestionType(),
                giver, giverSection, recipient, recipientSection, getSerializedFeedbackResponseDetail());
    }

    @Override
    public String toString() {
        return "FeedbackResponseAttributes [feedbackSessionName="
                + feedbackSessionName + ", courseId=" + courseId
                + ", feedbackQuestionId=" + feedbackQuestionId
                + ", feedbackQuestionType=" + getFeedbackQuestionType()
                + ", giver=" + giver + ", recipient=" + recipient
                + ", answer=" + getSerializedFeedbackResponseDetail() + "]";
    }

    @Override
    public void sanitizeForSaving() {
        // nothing to sanitize before saving
    }

    public String getSerializedFeedbackResponseDetail() {
        return responseDetails.getJsonString();
    }

    public FeedbackResponseDetails getResponseDetails() {
        return responseDetails.getDeepCopy();
    }

    public void setResponseDetails(FeedbackResponseDetails newFeedbackResponseDetails) {
        responseDetails = newFeedbackResponseDetails.getDeepCopy();
    }

    private FeedbackResponseDetails deserializeResponseFromSerializedString(String serializedResponseDetails,
                                                                            FeedbackQuestionType questionType) {
        if (questionType == FeedbackQuestionType.TEXT) {
            // For Text questions, the questionText simply contains the question, not a JSON
            // This is due to legacy data in the data store before there are multiple question types
            return new FeedbackTextResponseDetails(serializedResponseDetails);
        }
        return JsonUtils.fromJson(serializedResponseDetails, questionType.getResponseDetailsClass());
    }

    /**
     * Checks if this object represents a missing response.
     * A missing response should never be written to the database.
     * It should only be used as a representation.
     */
    public boolean isMissingResponse() {
        return responseDetails == null;
    }

    public static void sortFeedbackResponses(List<FeedbackResponseAttributes> frs) {
        frs.sort(Comparator.comparing(FeedbackResponseAttributes::getId));
    }

    /**
     * Returns a builder for {@link FeedbackResponseAttributes}.
     */
    public static Builder builder(String feedbackQuestionId, String giver, String recipient) {
        return new Builder(feedbackQuestionId, giver, recipient);
    }

    /**
     * Updates with {@link UpdateOptions}.
     */
    public void update(UpdateOptions updateOptions) {
        updateOptions.giverOption.ifPresent(s -> giver = s);
        updateOptions.giverSectionOption.ifPresent(s -> giverSection = s);
        updateOptions.recipientOption.ifPresent(s -> recipient = s);
        updateOptions.recipientSectionOption.ifPresent(s -> recipientSection = s);
        updateOptions.responseDetailsUpdateOption.ifPresent(this::setResponseDetails);
    }

    /**
     * Returns a {@link UpdateOptions.Builder} to build {@link UpdateOptions} for a response.
     */
    public static UpdateOptions.Builder updateOptionsBuilder(String feedbackResponseId) {
        return new UpdateOptions.Builder(feedbackResponseId);
    }

    /**
     * A builder for {@link FeedbackResponseCommentAttributes}.
     */
    public static class Builder extends BasicBuilder<FeedbackResponseAttributes, Builder> {

        private FeedbackResponseAttributes fra;

        private Builder(String feedbackQuestionId, String giver, String recipient) {
            super(new UpdateOptions(""));
            thisBuilder = this;

            Assumption.assertNotNull(Const.StatusCodes.NULL_PARAMETER, feedbackQuestionId);
            Assumption.assertNotNull(Const.StatusCodes.NULL_PARAMETER, giver);
            Assumption.assertNotNull(Const.StatusCodes.NULL_PARAMETER, recipient);
            fra = new FeedbackResponseAttributes(feedbackQuestionId, giver, recipient);
        }

        public Builder withCourseId(String courseId) {
            Assumption.assertNotNull(Const.StatusCodes.NULL_PARAMETER, courseId);
            fra.courseId = courseId;

            return this;
        }

        public Builder withFeedbackSessionName(String feedbackSessionName) {
            Assumption.assertNotNull(Const.StatusCodes.NULL_PARAMETER, feedbackSessionName);
            fra.feedbackSessionName = feedbackSessionName;

            return this;
        }

        @Override
        public FeedbackResponseAttributes build() {
            fra.update(updateOptions);

            return fra;
        }
    }

    /**
     * Helper class to specific the fields to update in {@link FeedbackResponseAttributes}.
     */
    public static class UpdateOptions {
        private String feedbackResponseId;

        private UpdateOption<String> giverOption = UpdateOption.empty();
        private UpdateOption<String> giverSectionOption = UpdateOption.empty();
        private UpdateOption<String> recipientOption = UpdateOption.empty();
        private UpdateOption<String> recipientSectionOption = UpdateOption.empty();
        private UpdateOption<FeedbackResponseDetails> responseDetailsUpdateOption = UpdateOption.empty();

        private UpdateOptions(String feedbackResponseId) {
            Assumption.assertNotNull(Const.StatusCodes.NULL_PARAMETER, feedbackResponseId);

            this.feedbackResponseId = feedbackResponseId;
        }

        public String getFeedbackResponseId() {
            return feedbackResponseId;
        }

        @Override
        public String toString() {
            return "FeedbackResponseAttributes.UpdateOptions ["
                    + "feedbackResponseId = " + feedbackResponseId
                    + ", giver = " + giverOption
                    + ", giverSection = " + giverSectionOption
                    + ", recipient = " + recipientOption
                    + ", recipientSection = " + recipientSectionOption
                    + ", responseDetails = " + JsonUtils.toJson(responseDetailsUpdateOption)
                    + "]";
        }

        /**
         * Builder class to build {@link UpdateOptions}.
         */
        public static class Builder extends BasicBuilder<UpdateOptions, Builder> {

            private Builder(String feedbackResponseId) {
                super(new UpdateOptions(feedbackResponseId));
                thisBuilder = this;
            }

            public Builder withGiver(String giver) {
                Assumption.assertNotNull(Const.StatusCodes.NULL_PARAMETER, giver);

                updateOptions.giverOption = UpdateOption.of(giver);
                return thisBuilder;
            }

            public Builder withRecipient(String recipient) {
                Assumption.assertNotNull(Const.StatusCodes.NULL_PARAMETER, recipient);

                updateOptions.recipientOption = UpdateOption.of(recipient);
                return thisBuilder;
            }

            @Override
            public UpdateOptions build() {
                return updateOptions;
            }

        }

    }

    /**
     * Basic builder to build {@link FeedbackResponseAttributes} related classes.
     *
     * @param <T> type to be built
     * @param <B> type of the builder
     */
    private abstract static class BasicBuilder<T, B extends BasicBuilder<T, B>> {

        protected UpdateOptions updateOptions;
        protected B thisBuilder;

        protected BasicBuilder(UpdateOptions updateOptions) {
            this.updateOptions = updateOptions;
        }

        public B withGiverSection(String giverSection) {
            Assumption.assertNotNull(Const.StatusCodes.NULL_PARAMETER, giverSection);

            updateOptions.giverSectionOption = UpdateOption.of(giverSection);
            return thisBuilder;
        }

        public B withRecipientSection(String recipientSection) {
            Assumption.assertNotNull(Const.StatusCodes.NULL_PARAMETER, recipientSection);

            updateOptions.recipientSectionOption = UpdateOption.of(recipientSection);
            return thisBuilder;
        }

        public B withResponseDetails(FeedbackResponseDetails responseDetails) {
            Assumption.assertNotNull(Const.StatusCodes.NULL_PARAMETER, responseDetails);

            updateOptions.responseDetailsUpdateOption = UpdateOption.of(responseDetails.getDeepCopy());
            return thisBuilder;
        }

        public abstract T build();

    }

}
