/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @description Handle button actions on Vendor record for onboarding process.
 */

define(['N/url', 'N/currentRecord', 'N/log'], (url, currentRecord, log) => {

    const pageInit = () => {};

    /**
     * Opens the related onboarding request
     */
    const viewOnboardingRequest = () => {
        const lastRequestId = currentRecord.get().getValue({ fieldId: 'custpage_last_request_id' });
        if (!lastRequestId) {
            log.error({title: 'viewOnboardingRequest', details: 'No request id on form'});
            return;
        }
        const targetUrl = url.resolveRecord({
            recordType: 'customrecord_acp_vonb_request',
            recordId: parseInt(lastRequestId, 10)
        });
        window.location.href = targetUrl;
    };

    /**
     * Opens form to create new onboarding request
     */
    const submitOnboardingRequest = () => {
        const targetUrl = url.resolveRecord({recordType: 'customrecord_acp_vonb_request'});
        window.location.href = targetUrl;
    };

    return {pageInit, viewOnboardingRequest, submitOnboardingRequest};
});
