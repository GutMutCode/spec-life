import { db } from './indexeddb';
import type { Task } from '@shared/Task';

/**
 * Seeds the database with sample tasks for development/testing.
 * Only runs in development mode and if database is empty.
 */
export async function seedSampleTasks(): Promise<void> {
  // Only seed in development
  if (import.meta.env.PROD) return;

  // Check if database already has tasks
  const count = await db.tasks.count();
  if (count > 0) return;

  console.log('🌱 Seeding sample tasks for development...');

  const sampleTasks: Task[] = [
    {
      id: crypto.randomUUID(),
      title: '프로젝트 기획서 작성',
      description: '새로운 기능에 대한 상세 기획서를 작성합니다.',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      rank: 0,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      title: '코드 리뷰',
      description: '팀원들의 PR을 검토하고 피드백을 제공합니다.',
      rank: 1,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      title: '회의 준비',
      description: '다음 주 스프린트 계획 회의를 위한 자료를 준비합니다.',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      rank: 2,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      title: '긴급 버그 수정',
      description: '프로덕션 환경에서 발견된 버그를 수정합니다.',
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday (overdue)
      rank: 3,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await db.tasks.bulkAdd(sampleTasks);
  console.log(`✅ Added ${sampleTasks.length} sample tasks`);
}

/**
 * Clears all tasks from the database.
 * Useful for testing/development.
 */
export async function clearAllTasks(): Promise<void> {
  await db.tasks.clear();
  console.log('🗑️ All tasks cleared');
}

// Make these functions globally available in development
if (import.meta.env.DEV) {
  (window as any).seedSampleTasks = seedSampleTasks;
  (window as any).clearAllTasks = clearAllTasks;
  console.log('💡 Dev helpers available: seedSampleTasks(), clearAllTasks()');
}
