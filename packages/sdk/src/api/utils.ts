/**
 * Shared API utility functions for result envelope construction and path checks.
 */

import { promises as fs } from "fs";
import type { ApiResult } from "./runs";

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function fail<T>(code: string, message: string): ApiResult<T> {
  return { ok: false, error: { code, message } };
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
