import React, {useEffect, useState} from 'react';
import {Box, Button, Card, CardContent, Stack, Typography} from "@mui/material";
import PipelineForm from "./pipeline-form.js";
import {PlayCircle} from "@mui/icons-material";


const widgetShared = {
    width: "500px",
    borderRadius: "20px",
}

const runPipelineStyle = {
    ...widgetShared,
    height: "50px",
    borderBottomLeftRadius: "0px",
    borderBottomRightRadius: "0px"
}

const pipelineCardStyle = {
    ...widgetShared,
    display: "inline-block",
    borderTopLeftRadius: "0px",
    borderTopRightRadius: "0px"
}

export default function RunPipeline(props) {
    const [formValid, setFormValid] = useState(false);
    const [formData, setFormData] = useState(false);
    const [jobId, setJobId] = useState("");
    const [jobStatus, setJobStatus] = useState("");
    const [jobDuration, setJobDuration] = useState(0);
    const [jobRunning, setJobRunning] = useState(false);

    function onFormDataUpdate(newFormData, valid) {
        setFormValid(valid)
        setFormData(newFormData)
    }

    function updateJobStatus(jobId, interval) {
        let query = `jobid=="${jobId}"`
        let url = `/api/v2/jobs?cfxql_query=${encodeURIComponent(query)}`
        fetch(url, {
            method: "GET",
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        }).then(response => response.json()).then(data => {
            if ("rda_jobs" in data) {
                if (data["rda_jobs"].length > 0) {
                    let job = data["rda_jobs"][0]
                    let jobStatus = job["status"]
                    if (jobStatus === "Completed" || jobStatus === "Failed" || jobStatus === "Evicted") {
                        clearInterval(interval)
                        setJobRunning(false)
                        setJobDuration(0)
                        if ("start_time" in job && "ended_time" in job) {
                            setJobDuration((job["ended_time"] - job["start_time"]) / 1000)
                        }
                    }
                    setJobStatus(jobStatus)
                }
            }
        });
    }

    useEffect(() => {
        if (jobId === "") {
            return;
        }
        const interval = setInterval(() => {
            updateJobStatus(jobId, interval)
        }, 1_000);
        updateJobStatus(jobId, interval)

        return () => clearInterval(interval);
    }, [jobId])

    function onRun() {
        if (!formValid) return
        setJobRunning(true)
        setJobId("")
        setJobDuration(0)
        let sites = encodeURIComponent(props["sites"])
        let url = `/api/v2/pipelines/${props["draft"] ? "draft" : "pipeline"}/${props["pipeline"]}/version/${props["version"]}/run?sites=${sites}`
        let body = [formData]
        setJobStatus("Sending request")
        fetch(url, {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        }).then(response => response.json()).then(data => {
            setJobId(data["serviceResult"]["job_id"])
            setJobStatus("Starting job")
        });
    }

    return (
        <Box sx={{width: '100%'}}>
            <Stack>
                <Box padding={8} paddingTop={2}>
                    <PipelineForm schema={props["schema"]} uischema={props["uiSchema"]} updater={onFormDataUpdate}/>
                </Box>
                <Box textAlign='center'>
                    <Button fullWidth loading={jobRunning} loadingPosition="end" endIcon={<PlayCircle/>} disabled={!formValid} variant="contained" color={props["runButtonColor"]} sx={runPipelineStyle} onClick={onRun}>
                        {props["runButtonText"]}
                    </Button>
                    <Box>
                        <Card sx={pipelineCardStyle}>
                            <CardContent>
                                {props["showPipeline"] ?
                                    <>
                                        <Typography variant="h5" component="div">
                                            {props["pipeline"]}
                                        </Typography>
                                        <Typography sx={{color: 'text.secondary', mb: 1.5}}>v{props["version"]}</Typography>
                                    </>
                                    : <></>
                                }
                                {
                                    jobId === "" ?
                                        <Typography variant="body2">{jobRunning ? "Creating job..." : "Run pipeline to see job information"}</Typography>
                                        :
                                        (
                                            <>
                                                {props["showJobId"] ?
                                                    <>
                                                        <Typography variant="body2">
                                                            {jobId}
                                                        </Typography>
                                                        <br/>
                                                    </>
                                                    : <></>

                                                }
                                                <Typography variant="h6">
                                                    {jobStatus}
                                                    {
                                                        jobDuration > 0 ?
                                                            <Typography sx={{display: "inline"}} color={"textDisabled"}>&nbsp;({jobDuration}s)</Typography>
                                                            :
                                                            <></>
                                                    }
                                                </Typography>
                                            </>
                                        )
                                }
                            </CardContent>
                        </Card>
                    </Box>
                </Box>
            </Stack>
        </Box>
    )
}
