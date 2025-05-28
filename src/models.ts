export interface User {
  id: string;
  name: string;
  age: number;
  score: number;
  active: boolean;
  country: string;
  team: {
    name: string;
    leader: boolean;
    projects: {
      name: string;
      completed: boolean;
    }[];
  };
  logs: {
    date: string; // YYYY-MM-DD
    action: 'login' | 'logout';
  }[];
}
