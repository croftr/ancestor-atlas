export type Category = "species" | "culture" | "civilization";
export const CATEGORIES: Category[] = ["species", "culture", "civilization"];

export interface EntityProps {
  id: string;
  entity_id: string;
  name: string;
  category: Category;
  start_year: number; // astronomical
  end_year: number; // astronomical
  description: string;
  weight?: number; // culture heatmap intensity 0–1
}
