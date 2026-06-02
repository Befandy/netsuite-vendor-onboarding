/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 * @description Set vendor verification flag and date after onboarding approval
 */

define(['N/log', 'N/record'], (log, record) => {

    /**
     * @param {record.Record} requestRecord - the current onboarding request record
     */
    const setVendorVerification = (requestRecord) => {
        const vendorId = requestRecord.getValue({ fieldId: 'custrecord_acp_vonb_vendor' });
        if (!vendorId) {
            log.error('setVendorVerification:error', 'No vendor linked to the onboarding request');
            return;
        }

        record.submitFields({
            type: record.Type.VENDOR,
            id: vendorId,
            values: {
                custentity_acp_vonb_verified: true,
                custentity_acp_vonb_verified_date: new Date()
            }
        });
    };

    /**
     * Executes the workflow action. Set vendor verification flag and date after onboarding approval.
     * @param {context} context
     */
    const onAction = (context) => {
        try {
            setVendorVerification(context.newRecord);
        } catch (e) {
            log.error('onAction:error', JSON.stringify({
                name: e.name,
                message: e.message,
                stack: e.stack,
                recordId: context.newRecord.id
            }));
        }
    };

    return { onAction };
});
