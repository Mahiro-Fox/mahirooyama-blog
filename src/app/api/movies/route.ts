import { NextRequest, NextResponse } from 'next/server';
import {
  adminCreateMovie,
  adminDeleteMovie,
  adminUpdateMovie,
  getMovies,
  type Movie,
} from '@/actions/admin/movie-actions';

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search') ?? undefined;
  const tag = request.nextUrl.searchParams.get('tag') ?? undefined;

  const result = await getMovies(search, tag);

  if (result.success) {
    return NextResponse.json(result.data);
  } else {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Omit<Movie, 'created_at'>;
    const result = await adminCreateMovie(body);

    if (result.success) {
      return NextResponse.json(result.data, { status: 201 });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: '创建电影失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<Movie> & { id: string };
    if (!body.id) {
      return NextResponse.json({ error: '缺少 id 参数' }, { status: 400 });
    }

    const result = await adminUpdateMovie(body);

    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: '更新电影失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: '缺少 id 参数' }, { status: 400 });
  }

  const result = await adminDeleteMovie(id);

  if (result.success) {
    return NextResponse.json({ message: result.message ?? '删除成功' });
  } else {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
}
