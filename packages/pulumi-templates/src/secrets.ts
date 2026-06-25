import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface ContainerSecretsInput {
  /** Secrets Manager secret name, e.g. `/awsify/my-app/env`. Owned by the GitHub Action or the worker. */
  envSecretName: string;
  /** JSON keys inside the secret to expose to the container. */
  keys: string[];
  /** Names already provided as plaintext env (e.g. DATABASE_URL) — excluded to avoid duplicate definitions. */
  excludeNames?: Iterable<string>;
}

export interface ContainerSecrets {
  /** ARN of the resolved secret, for granting the execution role read access. */
  secretArn: pulumi.Output<string>;
  /** ECS `secrets` entries: each pulls one JSON key out of the secret at task launch. */
  secrets: pulumi.Output<Array<{ name: string; valueFrom: string }>>;
}

/**
 * Resolves the env Secrets Manager secret (created out-of-band by the GitHub
 * Action or the worker) and maps the requested JSON keys onto ECS task
 * `secrets` entries via `secret-arn:key::` value references.
 */
export function buildContainerSecrets(input: ContainerSecretsInput): ContainerSecrets {
  const lookup = aws.secretsmanager.getSecretOutput({ name: input.envSecretName });
  const exclude = new Set(input.excludeNames ?? []);
  const keys = input.keys.filter((key) => !exclude.has(key));

  const secrets = lookup.arn.apply((arn) =>
    keys.map((key) => ({ name: key, valueFrom: `${arn}:${key}::` }))
  );

  return { secretArn: lookup.arn, secrets };
}
