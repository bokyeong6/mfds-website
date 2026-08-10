import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Directory path: public/images/
    const uploadDir = path.join(process.cwd(), 'public', 'images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Normalize path separators and extract base filename to flatten the folder structure
    const normalizedName = file.name.replace(/\\/g, '/');
    const baseName = normalizedName.split('/').pop() || file.name;

    // Save directly to public/images/
    const filePath = path.join(uploadDir, baseName);
    await fs.promises.writeFile(filePath, buffer);
    console.log(`[API Upload] Successfully saved: ${baseName}`);

    return NextResponse.json({ success: true, filename: baseName });
  } catch (error: unknown) {
    console.error('Upload API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
