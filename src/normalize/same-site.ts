import { portOf } from './port-of.js';

export function sameSite(left: URL, right: URL): boolean {
  return left.hostname === right.hostname && portOf(left) === portOf(right);
}
