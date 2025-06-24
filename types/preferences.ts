export interface UserPreferences {
  contentInterests: string;
  presentationStyle: string;
}

export interface DatabasePreferences {
  content_preferences: string;
  style_preferences: string;
}

export interface ConflictResolution {
  contentChoice: 'local' | 'database';
  styleChoice: 'local' | 'database';
}

export interface PreferenceConflict {
  hasContentConflict: boolean;
  hasStyleConflict: boolean;
  local: UserPreferences;
  database: UserPreferences;
}

export interface PreferencesApiResponse {
  success: boolean;
  preferences?: DatabasePreferences;
  error?: string;
}

export interface PreferencesApiRequest {
  content_preferences: string;
  style_preferences: string;
} 