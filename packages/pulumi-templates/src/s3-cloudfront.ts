import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import type { DeploymentPlan } from "@awsify/deployment-schemas";

export interface S3CloudFrontInput {
  plan: DeploymentPlan;
}

export interface S3CloudFrontOutputs {
  liveUrl: pulumi.Output<string>;
  bucketName: pulumi.Output<string>;
  distributionId: pulumi.Output<string>;
}

export function createS3CloudFrontStack(input: S3CloudFrontInput): S3CloudFrontOutputs {
  const appName = input.plan.appName;

  const bucket = new aws.s3.BucketV2(`${appName}-assets`, {
    bucket: `${appName}-assets-${input.plan.projectId.slice(-6)}`,
    forceDestroy: true
  });

  new aws.s3.BucketPublicAccessBlock(`${appName}-block`, {
    bucket: bucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true
  });

  // Origin Access Control (modern replacement for OAI)
  const oac = new aws.cloudfront.OriginAccessControl(`${appName}-oac`, {
    name: `${appName}-oac`,
    originAccessControlOriginType: "s3",
    signingBehavior: "always",
    signingProtocol: "sigv4"
  });

  const distribution = new aws.cloudfront.Distribution(`${appName}-cdn`, {
    enabled: true,
    defaultRootObject: "index.html",
    origins: [
      {
        domainName: bucket.bucketRegionalDomainName,
        originId: "s3-origin",
        originAccessControlId: oac.id
      }
    ],
    defaultCacheBehavior: {
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: ["GET", "HEAD"],
      targetOriginId: "s3-origin",
      viewerProtocolPolicy: "redirect-to-https",
      forwardedValues: { queryString: false, cookies: { forward: "none" } },
      minTtl: 0,
      defaultTtl: 86400,
      maxTtl: 31536000,
      compress: true
    },
    // SPA fallback — return index.html for 403/404 so client-side routing works
    customErrorResponses: [
      { errorCode: 403, responseCode: 200, responsePagePath: "/index.html" },
      { errorCode: 404, responseCode: 200, responsePagePath: "/index.html" }
    ],
    priceClass: "PriceClass_100",
    restrictions: { geoRestriction: { restrictionType: "none" } },
    viewerCertificate: { cloudfrontDefaultCertificate: true }
  });

  // Grant CloudFront access to S3
  new aws.s3.BucketPolicy(`${appName}-bucket-policy`, {
    bucket: bucket.id,
    policy: pulumi.all([bucket.arn, distribution.arn]).apply(([bucketArn, _distArn]) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "AllowCloudFront",
            Effect: "Allow",
            Principal: { Service: "cloudfront.amazonaws.com" },
            Action: "s3:GetObject",
            Resource: `${bucketArn}/*`
          }
        ]
      })
    )
  });

  return {
    liveUrl: pulumi.interpolate`https://${distribution.domainName}`,
    bucketName: bucket.bucket,
    distributionId: distribution.id
  };
}
