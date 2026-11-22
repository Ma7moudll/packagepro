import { describe,it,expect } from 'vitest';
import { redactReviewFileMetadata } from './artwork-review-response';

describe('reserved artwork review response boundary',()=>{
  it('redacts deeply nested order/production file lists and unknown metadata fields',()=>{
    const ordinary={id:'print',fileType:'print_file',fileUrl:'https://example.invalid/print',metadata:{sha256:'ordinary'}};
    const payload={order:{jobs:[{design:{files:[ordinary,{id:'review',fileType:'artwork_review',fileUrl:'secret-url',storageKey:'top-level-private',ownerId:'private-owner',metadata:{storageKey:'private-key',ownerId:'private-owner',sha256:'private-checksum',snapshotHash:'private-revision',futureSecret:'secret'}}]}}]}};
    const result=redactReviewFileMetadata(payload) as any;
    expect(result.order.jobs[0].design.files[0]).toEqual(ordinary);
    const review=result.order.jobs[0].design.files[1];
    expect(review.id).toBe('review');expect(review.fileUrl).toBeNull();expect(review.metadata).toEqual({productionReady:false});
    expect(JSON.stringify(result)).not.toContain('private-');expect(JSON.stringify(result)).not.toContain('futureSecret');
    expect(payload.order.jobs[0].design.files[1].fileUrl).toBe('secret-url');
  });
  it('preserves dates, buffers, primitives and owner-only artifact receipts',()=>{
    const date=new Date();const buffer=Buffer.from('test');const receipt={id:'file',snapshotHash:'revision',sha256:'checksum',pdfBase64:'bytes'};
    expect(redactReviewFileMetadata(date)).toBe(date);expect(redactReviewFileMetadata(buffer)).toBe(buffer);expect(redactReviewFileMetadata(null)).toBeNull();expect(redactReviewFileMetadata(receipt)).toEqual(receipt);
  });
});
