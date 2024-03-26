# SPDX-FileCopyrightText: © 2024 Kevin Lu
# SPDX-Licence-Identifier: AGPL-3.0-or-later
import fastjsonschema
import json
import os
import re
from ruamel.yaml import YAML

if __name__ == "__main__":
    yaml = YAML()
    with open("src/vector.schema.yaml") as f:
        schema = yaml.load(f)

    vector_files = []
    for root, dirs, files in os.walk("data"):
        for file in files:
            if re.search("^[0-9]{4}-[0-9]{2}-[0-9]{2}\.vector\.json$", file):
                vector_files.append(os.path.join(root, file))

    validator = fastjsonschema.compile(schema)

    fail = False
    for file_name in vector_files:
        with open(file_name) as f:
            vector = json.load(f)
            try:
                validator(vector)
            except fastjsonschema.JsonSchemaException as e:
                print(f"Data failed validation in {file_name}: {e}")
                fail = True
    if fail:
        exit(1)
    exit(0)
