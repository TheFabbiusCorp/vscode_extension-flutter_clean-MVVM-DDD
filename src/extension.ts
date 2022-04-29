import * as _ from "lodash";
import * as changeCase from "change-case";
import * as mkdirp from "mkdirp";
import * as path from "path";

import {
  commands,
  ExtensionContext,
  InputBoxOptions,
  OpenDialogOptions,
  Uri,
  workspace,
  window,
} from "vscode";
import { existsSync, lstatSync } from "fs";
import { analyzeDependencies } from "./utils";

enum Layer {
  All,
  Data,
  Domain,
  Presentation,
}

export function activate (_context: ExtensionContext) {
  analyzeDependencies();

  commands.registerCommand("extension.new-feature-all", async (uri: Uri) => {
    Go(uri, Layer.All);
  });

  commands.registerCommand("extension.new-feature-data", async (uri: Uri) => {
    Go(uri, Layer.Data);
  });

  commands.registerCommand("extension.new-feature-domain", async (uri: Uri) => {
    Go(uri, Layer.Domain);
  });

  commands.registerCommand("extension.new-feature-presentation", async (uri: Uri) => {
    Go(uri, Layer.Presentation);
  });
}

export async function Go (uri: Uri, layer: Layer) {
  // Show feature prompt
  let featureName = await promptForFeatureName();

  // Abort if name is not valid
  if (!isNameValid(featureName)) {
    window.showErrorMessage("The name must not be empty");
    return;
  }
  featureName = `${featureName}`;

  let targetDirectory = "";
  try {
    targetDirectory = await getTargetDirectory(uri);
  } catch (error) {
    if (error instanceof Error) {
      window.showErrorMessage(error.message);
    }
  }

  const pascalCaseFeatureName = changeCase.pascalCase(
    featureName.toLowerCase()
  );

  try {
    switch (layer) {
      case Layer.All:
        await generateFeatureArchitecture(
          `${featureName}`,
          targetDirectory
        );
        break;
      case Layer.Data:
        await generateFeatureArchitectureData(
          `${featureName}`,
          targetDirectory
        );
        break;
      case Layer.Domain:
        await generateFeatureArchitectureDomain(
          `${featureName}`,
          targetDirectory
        );
        break;
      case Layer.Presentation:
        await generateFeatureArchitecturePresentation(
          `${featureName}`,
          targetDirectory
        );
        break;
      default:
        break;
    }
    window.showInformationMessage(
      `Successfully Generated ${pascalCaseFeatureName} Feature`
    );
  } catch (error) {
    window.showErrorMessage(
      `Error:
        ${error instanceof Error ? error.message : JSON.stringify(error)}`
    );
  }
}

export function isNameValid (featureName: string | undefined): boolean {
  // Check if feature name exists
  if (!featureName) {
    return false;
  }
  // Check if feature name is null or white space
  if (_.isNil(featureName) || featureName.trim() === "") {
    return false;
  }

  // Return true if feature name is valid
  return true;
}

export async function getTargetDirectory (uri: Uri): Promise<string> {
  let targetDirectory;

  if (_.isNil(_.get(uri, "fsPath")) || !lstatSync(uri.fsPath).isDirectory()) {
    if(workspace.workspaceFolders !== undefined) {
      targetDirectory = workspace.workspaceFolders[0].uri.path;
    }
    else {
      throw Error("There is some problem in fetching current directory from the workspace.")
    }
  } else {
    targetDirectory = uri.fsPath;
  }

  return targetDirectory;
}

export async function promptForTargetDirectory (): Promise<string | undefined> {
  const options: OpenDialogOptions = {
    canSelectMany: false,
    openLabel: "Select a folder to create the feature in",
    canSelectFolders: true,
  };

  return window.showOpenDialog(options).then((uri) => {
    if (_.isNil(uri) || _.isEmpty(uri)) {
      return undefined;
    }
    return uri[0].fsPath;
  });
}

export function promptForFeatureName (): Thenable<string | undefined> {
  const blocNamePromptOptions: InputBoxOptions = {
    prompt: "Feature Name",
    placeHolder: "counter",
  };
  return window.showInputBox(blocNamePromptOptions);
}

export async function generateFeatureArchitecture (
  featureName: string,
  targetDirectory: string
) {
  // Create the feature directory if its does not exist yet
  const featureDirectoryPath = path.join(targetDirectory, featureName);
  if (!existsSync(featureDirectoryPath)) {
    await createDirectory(featureDirectoryPath);
  }

  // Create the data layer
  await generateFeatureArchitectureData(featureName, targetDirectory);

  // Create the domain layer
  await generateFeatureArchitectureDomain(featureName, targetDirectory);

  // Create the presentation layer
  await generateFeatureArchitecturePresentation(featureName, targetDirectory);
}

export async function generateFeatureArchitectureData (
  featureName: string,
  targetDirectory: string
) {
  // Create the feature directory if its does not exist yet
  const featureDirectoryPath = path.join(targetDirectory, featureName);
  if (!existsSync(featureDirectoryPath)) {
    await createDirectory(featureDirectoryPath);
  }

  // Create the data layer
  const dataLayerPath = path.join(featureDirectoryPath, "data");
  const dataLayerAdapterPath = path.join(dataLayerPath, "adapter");
  await createDirectories(dataLayerAdapterPath, [
    "repositories",
  ]);
  const dataLayerAdapterContractsPath = path.join(dataLayerAdapterPath, "contracts");
  await createDirectories(dataLayerAdapterContractsPath, [
    "local",
    "remote",
  ]);
  const dataLayerAdapterModelsPath = path.join(dataLayerAdapterPath, "models");
  await createDirectories(dataLayerAdapterModelsPath, [
    "local",
    "remote",
  ]);

  const dataLayerDSPath = path.join(dataLayerPath, "data_source");
  await createDirectories(dataLayerDSPath, [
    "local",
    "remote",
  ]);
}

export async function generateFeatureArchitectureDomain (
  featureName: string,
  targetDirectory: string
) {
  // Create the feature directory if its does not exist yet
  const featureDirectoryPath = path.join(targetDirectory, featureName);
  if (!existsSync(featureDirectoryPath)) {
    await createDirectory(featureDirectoryPath);
  }

  // Create the domain layer
  const domainLayerPath = path.join(featureDirectoryPath, "domain");
  await createDirectories(domainLayerPath, [
    "contracts",
  ]);
  const domainLayerAdapterModelsPath = path.join(domainLayerPath, "models");
  await createDirectories(domainLayerAdapterModelsPath, [
    "aggregators",
    "entities",
    "failures",
    "validators",
    "value_objects",
  ]);

}

export async function generateFeatureArchitecturePresentation (
  featureName: string,
  targetDirectory: string
) {
  // Create the feature directory if its does not exist yet
  const featureDirectoryPath = path.join(targetDirectory, featureName);
  if (!existsSync(featureDirectoryPath)) {
    await createDirectory(featureDirectoryPath);
  }

  // Create the presentation layer
  const presentationDirectoryPath = path.join(featureDirectoryPath,"presentation");
  await createDirectories(presentationDirectoryPath, [
    "models",
    "view",
    "view_models",
  ]);
}

export function getFeaturesDirectoryPath (currentDirectory: string): string {
  // Split the path
  const splitPath = currentDirectory.split(path.sep);

  // Remove trailing \
  if (splitPath[splitPath.length - 1] === "") {
    splitPath.pop();
  }

  // Rebuild path
  const result = splitPath.join(path.sep);

  // Determines whether we're already in the features directory or not
  const isDirectoryAlreadyFeatures =
    splitPath[splitPath.length - 1] === "features";

  // If already return the current directory if not, return the current directory with the /features append to it
  return isDirectoryAlreadyFeatures ? result : path.join(result, "features");
}

export async function createDirectories (
  targetDirectory: string,
  childDirectories: string[]
): Promise<void> {
  // Create the parent directory
  await createDirectory(targetDirectory);

  // Create the children
  childDirectories.map(
    async (directory) =>
      await createDirectory(path.join(targetDirectory, directory))
  );
}

function createDirectory (targetDirectory: string): Promise<void> {
  return new Promise((resolve, reject) => {
    mkdirp(targetDirectory, (error: any) => {
      if (error) {
        return reject(error);
      }
      resolve();
    });
  });
}
