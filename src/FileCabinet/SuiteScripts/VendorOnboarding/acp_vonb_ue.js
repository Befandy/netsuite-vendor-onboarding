/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @description Show button to create/open onboarding request and display banner based on the request status.
 */
define(['N/query', 'N/log', 'N/ui/message', 'N/runtime'], (query, log, message, runtime) => {

    // ===== Configuration =====
    // Resolved at runtime from Script Parameters configured on the script deployment.
    // Portable across NetSuite accounts: the customlist values' internal IDs differ per account,
    // but the parameter references them by scriptid via deployment configuration.
    const script = runtime.getCurrentScript();
    const APPROVED_STATUS = Number(script.getParameter({ name: 'custscript_acp_vonb_approved_status' }));
    const REJECTED_STATUS = Number(script.getParameter({ name: 'custscript_acp_vonb_rejected_status' }));

    /**
     * Search for the last onboarding request for the given vendor.
     * @param {number} vendorId - current Vendor record ID
     * @return {Object|null} onboardingRequests - last onboarding request for current vendor or null if no request exist
     */
    const getLastOnboardingRequest = (vendorId) => {
        const sql = `
        SELECT id, custrecord_acp_vonb_status AS status
        FROM customrecord_acp_vonb_request
        WHERE custrecord_acp_vonb_vendor = ?
        ORDER BY created DESC
        FETCH FIRST 1 ROWS ONLY `

        const params = [vendorId];
        const onboardingRequests = query.runSuiteQL({ query: sql, params }).asMappedResults();
        if (!onboardingRequests || onboardingRequests.length === 0) return null;
        return onboardingRequests[0];
    };

    /**
     * Core checking function to determine onboarding status and display appropriate button and banner.
     *
     * @param {Form} form
     * @param {record.Record} rec - current Vendor record
     */
    const checkVendorOnboardingStatus = (form, rec) => {
        const vendorId = rec.id;

        const isVendorVerified = rec.getValue({ fieldId: 'custentity_acp_vonb_verified' });
        if (isVendorVerified) return; //Banner and button not need if vendor is already verified

        form.clientScriptModulePath = './acp_vonb_cs.js';

        const onboardingRequest = getLastOnboardingRequest(vendorId);

        if (!onboardingRequest) {
            form.addPageInitMessage({
                type: message.Type.WARNING,
                title: 'Vendor onboarding is not started',
                message: 'Please submit onboarding request.',
                duration: 0
            });
            form.addButton({
                id: 'custpage_submit_request_btn',
                label: 'Submit Onboarding Request',
                functionName: 'submitOnboardingRequest'
            });
        }
        else {
            form.addField({
                id: 'custpage_last_request_id',
                type: 'integer',
                label: 'Last Onboarding Request ID'})
                .updateDisplayType({ displayType: 'hidden' })
                .defaultValue = onboardingRequest.id;

            form.addButton({id: 'custpage_view_request_btn',
                label: 'View Onboarding Request',
                functionName: 'viewOnboardingRequest'
            });

            if (onboardingRequest.status === REJECTED_STATUS) {
                form.addPageInitMessage({
                    type: message.Type.WARNING,
                    title: 'Vendor onboarding is rejected',
                    message: 'Please review the onboarding request before proceeding.',
                    duration: 0
                });

            } else if (onboardingRequest.status !== APPROVED_STATUS) {
                form.addPageInitMessage({
                    type: message.Type.WARNING,
                    title: 'Vendor onboarding is in progress',
                    message: 'Please check request status.',
                    duration: 0
                });
            }
        }
    };

    const beforeLoad = (context) => {
        try {
            if (context.type !== context.UserEventType.VIEW) return;
            checkVendorOnboardingStatus(context.form, context.newRecord);
        } catch (e) {
            log.error({
                title: 'checkVendorOnboardingStatus.beforeLoad',
                details: {
                    name: e.name,
                    message: e.message,
                    stack: e.stack,
                }
            });
        }
    };

    return { beforeLoad };
});
