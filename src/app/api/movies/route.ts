import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface MovieSource {
  name: string;
  url: string;
}

interface Movie {
  id: string;
  title: string;
  poster: string;
  year: string;
  tags: string[];
  summary: string;
  created_at: string;
  sources: MovieSource[];
}

const MOVIES_PATH = path.join(process.cwd(), 'data', 'movies.json');

function readMovies(): Movie[] {
  try {
    const data = fs.readFileSync(MOVIES_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeMovies(movies: Movie[]): void {
  fs.writeFileSync(MOVIES_PATH, JSON.stringify(movies, null, 2));
}

export async function GET(request: NextRequest) {
  const movies = readMovies();
  const search = request.nextUrl.searchParams.get('search');
  const tag = request.nextUrl.searchParams.get('tag');

  let filtered = movies;

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.title.toLowerCase().includes(searchLower) ||
        m.summary.toLowerCase().includes(searchLower)
    );
  }

  if (tag) {
    filtered = filtered.filter((m) => m.tags.includes(tag));
  }

  return NextResponse.json(filtered);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Omit<Movie, 'id' | 'created_at'>;
    const movies = readMovies();

    const newMovie: Movie = {
      ...body,
      id: `${body.title.toLowerCase().replace(/\s+/g, '-')}-${body.year}`,
      created_at: new Date().toISOString(),
    };

    movies.push(newMovie);
    writeMovies(movies);

    return NextResponse.json(newMovie, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: '创建电影失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<Movie>;
    if (!body.id) {
      return NextResponse.json({ error: '缺少 id 参数' }, { status: 400 });
    }

    const movies = readMovies();
    const index = movies.findIndex((m) => m.id === body.id);

    if (index === -1) {
      return NextResponse.json({ error: '电影不存在' }, { status: 404 });
    }

    movies[index] = { ...movies[index], ...body };
    writeMovies(movies);

    return NextResponse.json(movies[index]);
  } catch (error) {
    return NextResponse.json(
      { error: '更新电影失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: '缺少 id 参数' }, { status: 400 });
  }

  const movies = readMovies();
  const filtered = movies.filter((m) => m.id !== id);

  if (filtered.length === movies.length) {
    return NextResponse.json({ error: '电影不存在' }, { status: 404 });
  }

  writeMovies(filtered);

  return NextResponse.json({ message: '删除成功' });
}