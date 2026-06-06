import type { DeploymentSuggestion } from "@awsify/deployment-schemas";
import { nodeDockerfile } from "./node.js";
import { staticSpaDockerfile } from "./static-spa.js";
import { pythonDockerfile } from "./python.js";
import { goDockerfile } from "./go.js";
import { rubyDockerfile } from "./ruby.js";
import { javaDockerfile } from "./java.js";
import { rustDockerfile } from "./rust.js";
import { phpDockerfile } from "./php.js";

export function generateDockerfile(suggestion: DeploymentSuggestion): string {
  switch (suggestion.appType) {
    case "nextjs-app":
    case "node-backend":
      return nodeDockerfile(suggestion);
    case "static-spa":
      return staticSpaDockerfile(suggestion);
    case "python-backend":
      return pythonDockerfile(suggestion);
    case "go-backend":
      return goDockerfile(suggestion);
    case "ruby-backend":
      return rubyDockerfile(suggestion);
    case "java-backend":
      return javaDockerfile(suggestion);
    case "rust-backend":
      return rustDockerfile(suggestion);
    case "php-backend":
      return phpDockerfile(suggestion);
  }
}
