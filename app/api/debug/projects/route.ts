
import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { projectShellSelect, serializeProject, serializeProjectShell } from '@/lib/projects/serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('DEBUG PROJECTS: Starting GET /api/projects');
    
    const user = await getRequestUser(request);
    console.log('DEBUG PROJECTS: User retrieved:', { id: user.id, email: user.email, plan: user.plan });

    try {
      console.log('DEBUG PROJECTS: Trying to fetch full projects...');
      const projects = await prisma.project.findMany({
        where: { userId: user.id },
        include: { contents: true, hooks: true },
        orderBy: { createdAt: 'desc' },
      });
      
      console.log('DEBUG PROJECTS: Full projects query successful, found:', projects.length);
      return NextResponse.json(projects.map(serializeProject));
    } catch (fullProjectsError) {
      console.error('DEBUG PROJECTS: Failed to load full projects:', fullProjectsError);
      try {
        console.log('DEBUG PROJECTS: Trying to fetch project shells...');
        const projects = await prisma.project.findMany({
          where: { userId: user.id },
          select: projectShellSelect,
          orderBy: { createdAt: 'desc' },
        });
        
        console.log('DEBUG PROJECTS: Project shells query successful, found:', projects.length);
        return NextResponse.json(projects.map(serializeProjectShell));
      } catch (fallbackError) {
        console.error('DEBUG PROJECTS: Failed to load project shells:', fallbackError);
        return NextResponse.json([]);
      }
    }
  } catch (error: any) {
    console.error('DEBUG PROJECTS: Error in GET /api/projects:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack?.toString(),
      type: error.constructor.name
    }, { status: 500 });
  }
}

