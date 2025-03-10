# Fabrix.ai RDAF Micro Frontends Examples

Fabrix.ai's **RDAF platform** provides a feature to create **micro frontends** (also known as custom widgets). This repository contains various examples demonstrating how to use this feature effectively.

## 📂 Repository Structure

Each directory under the `examples/` directory includes a **README** detailing:

- What the example accomplishes
- How to use it

## 🚀 Getting Started

The **Robotic Data Automation Fabric (RDAF) platform** allows users to create dashboards by defining them in JSON. With the release of version 8.0, RDAF now supports **micro-frontends**, enabling users to incorporate new widgets and dashboards using popular UI frameworks like **Vue, React, or others**. This upgrade offers a more flexible and scalable architecture, making it easier to build and customize dashboards to meet specific needs.

### Dashboard Structure

A dashboard consists of multiple components, including attachments and **custom widgets** (also called **micro-frontends**). Attachments can be various file types such as JSON, HTML, CSS, JavaScript, or other text-based formats, working together to define the dashboard’s functionality and design.

### Creating Custom Widgets

Custom widgets enhance user interaction and display tailored data. These widgets are added to a dashboard by defining them in the `custom_widgets` section of the dashboard’s JSON structure. They typically consist of:

- **HTML templates**
- **JavaScript files**
- **Other assets**

Example definition:

```json
"custom_widgets": {
  "gauge_display": {
    "artifacts": {
      "main": {
        "attachment": "index.html",
        "content_type": "text/html",
        "is_template": false
      },
      "main.js": {
        "attachment": "main.js",
        "content_type": "text/javascript",
        "is_template": false
      }
    }
  }
}
```

### Using Custom Widgets in Dashboards

The following JSON snippet shows how to include a custom widget in the dashboard definition:

```json
"dashboard_sections": [
  {
    "title": "Gauge Display",
    "widgets": [
      {
        "title": "Gauge Display",
        "widget_type": "custom_widget",
        "widget_implementation": "run_pipeline/run_pipeline",
        "min_width": 6,
        "max_width": 12,
        "height": 12,
        "widget_id": "4e2d534c",
        "fixed_variables": {}
      }
    ]
  }
]
```

### Explanation of Attributes

#### Custom Widgets Attributes

- **custom\_widgets**: Defines the custom widgets used in the dashboard.
- **widget\_name** (e.g., `gauge_display`): Unique identifier for each widget.
- **artifacts**: Section containing references to the widget's resources (HTML, JavaScript, etc.).
- **attachment**: Specifies the filename of the asset (e.g., `script.js` or `template.html`).
- **content\_type**: Defines the MIME type of the asset, such as `text/html` for HTML files or `text/javascript` for JavaScript files.
- **is\_template**: A true/false flag that indicates whether the asset is a template. If `true`, the asset supports dynamic content processing templates (currently supported jinja2).

#### Dashboard Section Attributes

- **dashboard\_sections**: Defines different sections within the dashboard.
- **title**: Provides a title or heading for a specific dashboard section.
- **widgets**: List of widgets included in the section.
- **widget\_type**: Specifies the type of widget (e.g., `custom_widget`).
- **widget\_implementation**: Path reference to the widget's implementation (file path, URL, etc.).
- **min\_width / max\_width**: Defines the minimum and maximum width for the widget.
- **height**: Specifies the height of the widget.
- **widget\_id**: Unique identifier for the widget.
- **fixed\_variables**: Dictionary of inputs passed to the widget.

### Micro-frontend Support

With the adoption of micro-frontends, users gain the flexibility to:

- Leverage any UI framework (**Vue, React, Angular, or plain HTML/CSS**) to develop and integrate widgets.
- Define custom widgets through the `custom_widgets` attribute.
- Attach necessary assets (**HTML, JavaScript, CSS**) to ensure seamless operation and design consistency.

This modular approach enhances flexibility, accelerates development, and ensures the platform remains future-proof.

## 📜 License

This repository is licensed under the **MIT License**. See the `LICENSE` file for details.

