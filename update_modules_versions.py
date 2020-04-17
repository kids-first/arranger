import os
import glob
import json


def is_path_desired(path):
    excluded_modules = ['admin-ui']
    return any(path for excluded_module in excluded_modules if excluded_module not in path)


def get_packages_content_name_version(packages_paths):
    info = []
    for package_path in packages_paths:
        with open(package_path, 'r') as f:
            data = json.load(f)
            info.append({
                'path': package_path,
                'name': data['name'],
                'version': data['version'],
                'content': data,
            })
    return info


def extract_packages_names_versions(packages_meta):
    return [{'name': package_meta['name'], 'version': package_meta['version']} for package_meta in packages_meta]


def update_given_package_node(node_ref, names_versions):
    for dependency_name, dependency_version in node_ref.items():
        if dependency_name.startswith('@kfarranger/'):
            matched_name_version = list(
                filter(lambda name_version: name_version['name'] == dependency_name, names_versions))
            if matched_name_version:
                up_to_date_name_version = matched_name_version[0]
                up_to_date_version = up_to_date_name_version['version']
                node_ref[dependency_name] = up_to_date_version
    return node_ref


def update_package_json_files(updated_packages_and_metadata):
    package_json_indent = 2
    for updated_package_and_metadata in updated_packages_and_metadata:
        package_path = updated_package_and_metadata['path']
        updated_package_json = updated_package_and_metadata['content']
        with open(package_path, 'w') as f:
            json.dump(updated_package_json, f, indent=package_json_indent)


arranger_root_directory = os.path.dirname(__file__)
modules_directory_path = os.path.join(arranger_root_directory, 'modules')

all_paths_to_modules_packages = glob.glob(modules_directory_path + '/*/package.json')
desired_paths_to_modules_packages = [path for path in all_paths_to_modules_packages if
                                     is_path_desired(path)]

packages_content_name_version = get_packages_content_name_version(desired_paths_to_modules_packages)
packages_names_versions = extract_packages_names_versions(packages_content_name_version)

# update package.json
for package_content_name_version in packages_content_name_version:
    package_to_update_name = package_content_name_version['name']
    package_to_update_content = package_content_name_version['content']

    package_dependencies_node_ref = package_to_update_content['dependencies']
    update_given_package_node(package_dependencies_node_ref, packages_names_versions)

    package_dev_dependencies_node_ref = package_to_update_content['devDependencies']
    update_given_package_node(package_dev_dependencies_node_ref, packages_names_versions)

update_package_json_files(packages_content_name_version)
