import { screen } from '@nut-tree-fork/nut-js';
import jpeg from 'jpeg-js';

async function testCapture() {
  console.time('grab');
  const img = await screen.grab();
  console.timeEnd('grab');
  
  // nut-js data is BGRA. jpeg-js expects RGBA. But we can just encode BGRA and see if it works.
  console.time('encode');
  // @ts-ignore
  const rawImageData = {
    data: img.data,
    width: img.width,
    height: img.height
  };
  const jpegImageData = jpeg.encode(rawImageData, 50);
  console.timeEnd('encode');
  
  console.log('Encoded size:', jpegImageData.data.length);
}

testCapture().catch(console.error);
