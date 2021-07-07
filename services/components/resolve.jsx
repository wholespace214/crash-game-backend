import React, { } from 'react'
import { Box, H3, Button} from '@admin-bro/design-system'
import { ApiClient, useNotice} from 'admin-bro'
import * as qs from "qs";
const api = new ApiClient()
const NOTICE_MESSAGE = {
    message: 'Bet resolved',
    type: 'success',
}


const Resolve = (props) => {
    const { record } = props;

    const addNotice = useNotice()

    const callAction = (record, index) => {
        api.recordAction({ recordId: record.id, actionName: 'do-resolve', resourceId: 'Bet',
            data: qs.stringify({index})}).then(res => {
            addNotice(NOTICE_MESSAGE);

            window.location.reload(true);
        })
    };

    const showBtn = (record.params.finalOutcome === undefined || record.params.finalOutcome.length === 0);

    const finalOutcome = record.params.finalOutcome !== undefined
            && record.params.finalOutcome.length > 0
            && record.params.outcomes[record.params.finalOutcome].name !== undefined
            && record.params.finalOutcome.length > 0 ? record.params.outcomes[record.params.finalOutcome].name : 'loading...';

    return (
        <Box variant="grey">
            <Box variant="white">
                <H3>Resolve BET - {record.params.marketQuestion}</H3>
                <Box>
                    <p>{showBtn ? 'This action cannot be reversed! Pick the final outcome to resolve the trade!' : 'The final outcome is: ' + finalOutcome} </p>
                    <br />
                    {console.log(record.params.outcomes)}
                    <p>
                        { showBtn && record.params.outcomes !== undefined &&
                            record.params.outcomes.map(obj => <Button onClick={() => {callAction(record, obj.index);}}>{obj.name}</Button>)
                        }
                    </p>
                </Box>
            </Box>
        </Box>
    )
}

export default Resolve