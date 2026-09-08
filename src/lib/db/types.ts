export type ExerciseCategory = 'compound' | 'isolation' | 'accessory' | 'cardio';
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other';

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  primary_muscle: string;
  equipment: Equipment;
  created_by: string | null;
  created_at: string;
};

export type WorkoutVisibility = 'private' | 'gym';

export type Workout = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  visibility: WorkoutVisibility;
  shared_gym_id: string | null;
  title: string | null;
  created_at: string;
};

export type Gym = {
  id: string;
  name: string;
  city: string | null;
  created_by: string | null;
  created_at: string;
};

export type GymMember = {
  gym_id: string;
  user_id: string;
  joined_at: string;
};

export type Follow = {
  follower_id: string;
  followee_id: string;
  created_at: string;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  home_gym: string | null;
  home_gym_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PostReaction = {
  workout_id: string;
  user_id: string;
  kind: 'fire';
  created_at: string;
};

export type PostComment = {
  id: string;
  workout_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type Challenge = {
  id: string;
  gym_id: string | null;
  created_by: string;
  name: string;
  description: string | null;
  metric: 'workout_count';
  goal_value: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

export type ChallengeParticipant = {
  challenge_id: string;
  user_id: string;
  joined_at: string;
};

export type FeedPost = Workout & {
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  gym: Pick<Gym, 'id' | 'name' | 'city'> | null;
  sets: (WorkoutSet & { exercise: Pick<Exercise, 'id' | 'name' | 'equipment'> })[];
  reactions: { count: number; mine: boolean };
  comments: { count: number };
};

export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
  weight_kg: number | null;
  reps: number;
  rpe: number | null;
  completed_at: string;
  created_at: string;
  is_pr: boolean;
};

export type PersonalRecord = {
  user_id: string;
  exercise_id: string;
  workout_set_id: string;
  weight_kg: number;
  reps: number;
  est_1rm_kg: number;
  achieved_at: string;
};

export type WorkoutWithSets = Workout & {
  sets: (WorkoutSet & { exercise: Pick<Exercise, 'id' | 'name' | 'equipment'> })[];
};

export type WorkoutTemplate = {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutTemplateExercise = {
  id: string;
  template_id: string;
  exercise_id: string;
  position: number;
  target_sets: number | null;
  target_reps: number | null;
};

export type WorkoutTemplateWithExercises = WorkoutTemplate & {
  exercises: (WorkoutTemplateExercise & { exercise: Pick<Exercise, 'id' | 'name' | 'equipment'> })[];
};

export type NotificationKind = 'reaction' | 'comment' | 'follow' | 'pr';

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  kind: NotificationKind;
  workout_id: string | null;
  comment_id: string | null;
  personal_record_exercise_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationWithRefs = Notification & {
  actor: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
  exercise: Pick<Exercise, 'id' | 'name'> | null;
};

export type FormAnalysisStatus = 'processing' | 'complete' | 'failed';

export type FormAnalysis = {
  id: string;
  user_id: string;
  workout_set_id: string | null;
  exercise_id: string;
  video_path: string;
  status: FormAnalysisStatus;
  score: number | null;
  feedback: string[] | null;
  metrics: Record<string, number | string> | null;
  frame_thumb_path: string | null;
  annotated_video_path: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};
