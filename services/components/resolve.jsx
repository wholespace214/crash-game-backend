import React, { } from 'react'
import {Box, H3, Button, Input, Label} from '@admin-bro/design-system'
import { ApiClient, useNotice} from 'admin-bro'
import * as qs from "qs";
const api = new ApiClient()
const NOTICE_MESSAGE = {
    message: 'Bet resolved',
    type: 'success',
}


const Resolve = (props) => {
    const { record } = props;
    let evidenceDescription = '';
    let evidenceActual = '';

    const addNotice = useNotice()

    const callAction = (record, index, evidenceDescription, evidenceActual) => {
        api.recordAction({ recordId: record.id, actionName: 'do-resolve', resourceId: 'Bet',
            data: qs.stringify({index, evidenceDescription, evidenceActual})}).then(res => {
            addNotice(NOTICE_MESSAGE);

            window.location.reload(true);
        });
    };

    const handleChangeDes = (e) => {
        evidenceDescription = e.target.value;
    };
    const handleChangeEvidence = (e) => {
        evidenceActual = e.target.value;
    };

    const showBtn = (record.params.finalOutcome === undefined || record.params.finalOutcome.length === 0) && !record.params.canceled;

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

                        { showBtn &&
                            <div>
                                <Label>Evidence Description</Label>
                                <Input onChange={handleChangeDes} type="text"></Input>

                                <br/>
                                <br/>
                                <br/>

                                <Label>Evidence Actual</Label>
                                <Input onChange={handleChangeEvidence} type="text"></Input>
                            </div>
                        }

                        <br/>
                        <br/>

                        <p>
                            { showBtn && record.params.outcomes !== undefined &&
                            record.params.outcomes.map(obj =>
                                <Button onClick={() => {callAction(record, obj.index, evidenceDescription, evidenceActual);}} style={{margin: "0px 15px 0px 0px"}}>{obj.name}</Button>)
                            }
                        </p>
                    </Box>
                { record.params.canceled &&
                    <p>Bet already cancelled</p>
                }

            </Box>
        </Box>
    )
}

export default Resolve