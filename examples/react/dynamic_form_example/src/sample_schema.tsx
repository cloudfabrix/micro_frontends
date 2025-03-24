const schema = {
    title: "Pipeline Runner",
    description: "Configure and run data processing pipelines",
    fields: [
      {
        id: "pipelineType",
        type: "select",
        label: "Select Pipeline Type",
        options: [
          { value: "", label: "-- Select Type --" },
          { value: "published", label: "Published" },
          { value: "draft", label: "Draft" },
          { value: "inline", label: "Inline" }
        ],
        required: true,
        resetFields: ["pipeline", "version", "inlineCode"]
      },
      {
        id: "pipeline",
        type: "select",
        label: "Select Pipeline",
        options: [
          { value: "", label: "-- Select Pipeline --" },
          { value: "pipe1", label: "Data Processing Pipeline" },
          { value: "pipe2", label: "ETL Pipeline" },
          { value: "pipe3", label: "ML Training Pipeline" }
        ],
        required: true,
        dependsOn: { 
          field: "pipelineType", 
          values: ["published", "draft"] 
        },
        resetFields: ["version"]
      },
      {
        id: "version",
        type: "select",
        label: "Select Version",
        dynamicOptions: {
          dependsOn: "pipeline",
          options: {
            pipe1: [
              { value: "", label: "-- Select Version --" },
              { value: "v1.0.0", label: "v1.0.0" },
              { value: "v1.1.0", label: "v1.1.0" },
              { value: "v1.2.0", label: "v1.2.0" }
            ],
            pipe2: [
              { value: "", label: "-- Select Version --" },
              { value: "v2.0.0", label: "v2.0.0" },
              { value: "v2.0.1", label: "v2.0.1" }
            ],
            pipe3: [
              { value: "", label: "-- Select Version --" },
              { value: "v1.0.0", label: "v1.0.0" },
              { value: "v2.0.0", label: "v2.0.0" },
              { value: "v3.0.0", label: "v3.0.0" }
            ]
          }
        },
        required: true,
        dependsOn: { 
          field: "pipeline", 
          notEmpty: true,
          parentConditions: [
            { field: "pipelineType", values: ["published", "draft"] }
          ]
        }
      },
      {
        id: "inlineCode",
        type: "codeEditor",
        label: "Python Code",
        placeholder: "# Enter your Python code here",
        rows: 10,
        required: true,
        dependsOn: { 
          field: "pipelineType", 
          values: ["inline"] 
        },
        validateCode: true,
        helpText: "Code must include at least one function definition using 'def'"
      }
    ],
    buttonText: "Run Pipeline",
    validationRules: [
      {
        when: { field: "pipelineType", values: ["inline"] },
        require: ["inlineCode"]
      },
      {
        when: { field: "pipelineType", values: ["published", "draft"] },
        require: ["pipeline", "version"]
      }
    ]
  };

  export default schema;