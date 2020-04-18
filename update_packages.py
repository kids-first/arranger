#!/usr/bin/env python3
import os
import glob
import json


"""
Helper script to update modules dependencies.

The script only does this:
 For instance, if you change the version of the package '@kf-arranger/middleware' from X to Y (header) and run the script
 then it will change all package.json files having the line '@kf-arranger/middleware': X to '@kf-arranger/middleware': Y.
 So you may have to run the script a few times. But all you have to do is to update the header version. 

Method:
    1) Change the package.json's version of the module(s) to update. For instance, '@kf-arranger/middleware'.
    2) Run the script for the first time. All packages containing '@kf-arranger/middleware' will have that line updated.
    3) Manually investigate all modified packages and change their version (header):
            For instance, you will see this line changed '@kf-arranger/middleware': Y in '@kf-arranger/mapping-utils', '@kf-arranger/server', ...
            Go to each of these files and update their version (header).
    4) Run the script a second time to update and/or unveil new affected dependencies.
    5) Repeat until all packages are updated.
    
Note: make sure the script is in the root dir of arranger.
"""
class Package:
    def __init__(self):
        pass

    @staticmethod
    def is_path_desired(path):
        excluded_modules = ['admin-ui']
        return any(path for excluded_module in excluded_modules if excluded_module not in path)

    @staticmethod
    def extract_names_versions(packages_meta):
        return [{'name': package_meta['name'], 'version': package_meta['version']} for package_meta in packages_meta]

    @staticmethod
    def get_contents_names_versions(packages_paths):
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

    @staticmethod
    def update_given_node(node_ref, all_names_versions):
        for dependency_name, dependency_version in node_ref.items():
            if dependency_name.startswith('@kfarranger/'):
                matched_name_version = list(
                    filter(lambda name_version: name_version['name'] == dependency_name, all_names_versions))
                if matched_name_version:
                    up_to_date_name_version = matched_name_version[0]
                    up_to_date_version = up_to_date_name_version['version']
                    node_ref[dependency_name] = up_to_date_version
        return node_ref

    @staticmethod
    def update_json_files(updated_packages_and_metadata):
        package_json_indent = 2
        for updated_package_and_metadata in updated_packages_and_metadata:
            package_path = updated_package_and_metadata['path']
            updated_package_json = updated_package_and_metadata['content']
            with open(package_path, 'w') as f:
                json.dump(updated_package_json, f, indent=package_json_indent)

    @staticmethod
    def update_all_targeted_packages(packages_and_meta):
        for content_name_version in packages_and_meta:
            package_to_update_content = content_name_version['content']

            package_dependencies_node_ref = package_to_update_content['dependencies']
            Package.update_given_node(package_dependencies_node_ref, names_versions)

            package_dev_dependencies_node_ref = package_to_update_content['devDependencies']
            Package.update_given_node(package_dev_dependencies_node_ref, names_versions)


if __name__ == "__main__":
    arranger_root_directory = os.path.dirname(__file__)
    modules_directory_path = os.path.join(arranger_root_directory, 'modules')

    pkg = Package()
    
    all_paths_to_modules_packages = glob.glob(modules_directory_path + '/*/package.json')
    desired_paths_to_modules_packages = [path for path in all_paths_to_modules_packages if
                                         pkg.is_path_desired(path)]

    contents_names_versions = pkg.get_contents_names_versions(desired_paths_to_modules_packages)
    
    names_versions = pkg.extract_names_versions(contents_names_versions)

    pkg.update_all_targeted_packages(contents_names_versions)

    pkg.update_json_files(contents_names_versions)
