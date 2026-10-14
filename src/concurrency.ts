/**
 * Maps items with an async mapper, running at most `concurrency` mappers at once. The results keep the input order.
 * Rejects with the first error, after which no more items are started.
 */
export async function mapConcurrently<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError(`Concurrency must be a positive integer, got ${concurrency}`);
  }

  const results: R[] = [];
  let next = 0;
  let failed = false;

  const worker = async (): Promise<void> => {
    if (failed || next >= items.length) {
      return;
    }
    const index = next++;
    try {
      results[index] = await mapper(items[index]);
    } catch (error) {
      failed = true;
      throw error;
    }
    return worker();
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
