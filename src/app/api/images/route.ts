import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const imagesDir = path.join(process.cwd(), 'public', 'images');
    if (!fs.existsSync(imagesDir)) {
      return NextResponse.json([]);
    }
    const files = await fs.promises.readdir(imagesDir);
    // Filter only image extensions
    const imageFiles = files.filter((f) => {
      const ext = f.split('.').pop()?.toLowerCase();
      return ext && ['jpg', 'jpeg', 'png'].includes(ext);
    });
    return NextResponse.json(imageFiles);
  } catch (error: unknown) {
    console.error('Failed to read images directory:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function DELETE() {
  try {
    const imagesDir = path.join(process.cwd(), 'public', 'images');
    if (fs.existsSync(imagesDir)) {
      const files = await fs.promises.readdir(imagesDir);
      for (const file of files) {
        const ext = file.split('.').pop()?.toLowerCase();
        if (ext && ['jpg', 'jpeg', 'png'].includes(ext)) {
          await fs.promises.unlink(path.join(imagesDir, file));
        }
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to clear images directory:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
