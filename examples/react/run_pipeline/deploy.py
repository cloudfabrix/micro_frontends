import argparse
import sys
import subprocess
import requests
import json

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog='deploy',
        description='Deploy dashboard',
        epilog='')
    parser.add_argument("-s", "--server", help="Server ip address to deploy in")
    parser.add_argument("-u", "--user", help="Username in the server")
    parser.add_argument("-p", "--password", help="Password in the server")
    parser.add_argument("-n", "--name", help="Name of the dashboard")
    parser.add_argument("-t", "--title", help="Title of the dashboard")

    args = parser.parse_args(sys.argv[1:])
    server = args.server
    user = args.user
    password = args.password
    name = args.name
    title = args.title
    if not server:
        print("Server is required")
        parser.print_help()
        sys.exit(1)
    if not user:
        print("User is required")
        parser.print_help()
        sys.exit(1)
    if not password:
        print("Password is required")
        parser.print_help()
        sys.exit(1)
    if not name:
        print("Name is required")
        parser.print_help()
        sys.exit(1)
    if not title:
        print("Title is required")
        parser.print_help()
        sys.exit(1)

    print(f"Server: {args.server} User: {args.user} dashboard name: {args.name}")
    print("Building the UI", flush=True)
    try:
        result = subprocess.run(["npm", "run", "build"], stderr=subprocess.PIPE)
        if result.returncode == 0:
            print("Successfully built the UI", flush=True)
        else:
            print("npm run build command failed")
            print(f"Error output: {result.stderr.decode('utf-8')}")
            sys.exit(1)
    except Exception as ex:
        print(f"Error while building the UI. Exception: {ex}")
        sys.exit(1)
    dashboard = {
        "name": name,
        "label": title,
        "live_edit": True,
        "version": "24.1.23.1",
        "description": title,
        "enabled": False,
        "dashboard_sections": [
            {
                "title": title,
                "widgets": [
                    {
                        "title": title,
                        "widget_type": "custom_widget",
                        "widget_implementation": f"{name}/{name}",
                        "min_width": 12,
                        "min_height": 12,
                        "widget_id": "4e2d534c",
                        "fixed_variables": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "test1": {
                                        "type": "string",
                                        "title": "Test 1"
                                    },
                                    "enum_test": {
                                        "title": "Enum Test",
                                        "type": "string",
                                        "enum": [
                                            "Min",
                                            "Max",
                                            "Avg",
                                            "Sum",
                                            "Cardinality"
                                        ]
                                    },
                                    "num_test": {
                                        "type": "number",
                                        "title": "Any Number"
                                    },
                                    "query_test": {
                                        "type": "string",
                                        "title": "Query Test"
                                    }
                                },
                                "required": [
                                    "test1",
                                    "num_test",
                                    "query_test"
                                ]
                            },
                            "uiSchema": {
                                "type": "VerticalLayout",
                                "elements": [
                                    {
                                        "type": "HorizontalLayout",
                                        "elements": [
                                            {"type": "Control", "scope": "#/properties/test1"},
                                            {"type": "Control", "scope": "#/properties/enum_test"}
                                        ]
                                    },
                                    {"type": "Control", "scope": "#/properties/num_test"},
                                    {
                                        "type": "Control",
                                        "scope": "#/properties/query_test",
                                        "options": {
                                            "apiUrl": "/api/v2/pstreams/pstream/att_app_cmdb/data?offset=0&limit=100",
                                            "labelField": "Number",
                                            "valueField": "Number"
                                        }
                                    }
                                ]
                            },
                            "pipeline": "simple-pipeline-save-dataset",
                            "pipelineVersion": "1.1.0.0",
                            "pipelinePublished": False,
                        },
                    }
                ]
            }
        ],
        "custom_widgets": {
            name: {
                "artifacts": {
                    "main": {
                        "attachment": "index.html",
                        "content_type": "text/html",
                        "is_template": False
                    },
                    "main.js": {
                        "attachment": "main.js",
                        "content_type": "text/javascript",
                        "is_template": False
                    }
                }
            }
        },
        "attachments": []
    }
    with open("dist/index.html") as f:
        dashboard.get("attachments").append({
            "name": "index.html",
            "value": f.read()
        })
    with open("dist/main.js") as f:
        dashboard.get("attachments").append({
            "name": "main.js",
            "value": f.read()
        })
    print(f"Successfully created dashboard.", flush=True)
    print(f"Logging into the server {server}", flush=True)
    with requests.Session() as s:
        login_url = f"https://{server}/api/v2/login"
        headers = {
            "accept": "application/json",
            "Content-Type": "application/json"
        }
        data = {
            "user": user,
            "password": password
        }
        resp = s.post(login_url, json=data, verify=False, headers=headers)
        try:
            resp.raise_for_status()
        except:
            print(f"Unable to login into the server {server}. Error: {resp.status_code} {resp}")
            sys.exit(1)
        print("Uploading the dashboard...")
        print(f"dashboard: {json.dumps(dashboard, indent=2)}")
        resp = s.put(f"https://{server}/api/v2/dashboards/dashboard/{name}", json=dashboard, verify=False, headers=headers)
        try:
            resp.raise_for_status()
        except:
            print(f"Unable to upload the dashboard. {server}. Error: {resp.status_code} {resp}")
            sys.exit(1)
        print("Successfully uploaded the dashboard")
