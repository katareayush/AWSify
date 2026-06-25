// Only accept images that live in an ECR registry, e.g.
// 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:<tag>.
// Tags allow [A-Za-z0-9._-]; repo paths allow nested namespaces.
const ECR_IMAGE_URI = /^\d{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com\/[A-Za-z0-9._/-]+:[A-Za-z0-9._-]+$/;

export function isValidEcrImageUri(imageUri: string): boolean {
  return ECR_IMAGE_URI.test(imageUri);
}
