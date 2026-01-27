import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export type IconName =
  | "home"
  | "dumbbell"
  | "list"
  | "menu"
  | "search"
  | "x"
  | "plus"
  | "trophy"
  | "chevron-right"
  | "chevron-up"
  | "chevron-down"
  | "arrow-left"
  | "check"
  | "chart"
  | "swap"
  | "share"
  | "file-text"
  | "chest"
  | "back"
  | "legs"
  | "hips"
  | "shoulders"
  | "arms"
  | "core"
  | "cardio";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 24, color = "#374151" }: IconProps) {
  switch (name) {
    // Tab icons
    case "home":
      return <Feather name="home" size={size} color={color} />;
    case "dumbbell":
      return <MaterialCommunityIcons name="dumbbell" size={size} color={color} />;
    case "list":
      return <Feather name="list" size={size} color={color} />;
    case "menu":
      return <MaterialCommunityIcons name="clipboard-list-outline" size={size} color={color} />;

    // Action icons
    case "search":
      return <Feather name="search" size={size} color={color} />;
    case "x":
      return <Feather name="x" size={size} color={color} />;
    case "plus":
      return <Feather name="plus" size={size} color={color} />;
    case "trophy":
      return <Feather name="award" size={size} color={color} />;
    case "chevron-right":
      return <Feather name="chevron-right" size={size} color={color} />;
    case "chevron-up":
      return <Feather name="chevron-up" size={size} color={color} />;
    case "chevron-down":
      return <Feather name="chevron-down" size={size} color={color} />;
    case "arrow-left":
      return <Feather name="arrow-left" size={size} color={color} />;
    case "check":
      return <Feather name="check" size={size} color={color} />;
    case "chart":
      return <Feather name="bar-chart-2" size={size} color={color} />;
    case "swap":
      return <Ionicons name="swap-horizontal" size={size} color={color} />;
    case "share":
      return <Feather name="share" size={size} color={color} />;
    case "file-text":
      return <Feather name="file-text" size={size} color={color} />;

    // Body part icons
    case "chest":
      return <MaterialCommunityIcons name="human" size={size} color={color} />;
    case "back":
      return <MaterialCommunityIcons name="human-handsup" size={size} color={color} />;
    case "legs":
      return <MaterialCommunityIcons name="human-male" size={size} color={color} />;
    case "hips":
      return <MaterialCommunityIcons name="meditation" size={size} color={color} />;
    case "shoulders":
      return <MaterialCommunityIcons name="arm-flex-outline" size={size} color={color} />;
    case "arms":
      return <MaterialCommunityIcons name="arm-flex" size={size} color={color} />;
    case "core":
      return <Ionicons name="fitness-outline" size={size} color={color} />;
    case "cardio":
      return <MaterialCommunityIcons name="run" size={size} color={color} />;

    default:
      return <Feather name="circle" size={size} color={color} />;
  }
}

// Body part icon mapping for category display
export const BODY_PART_ICONS: Record<string, IconName> = {
  chest: "chest",
  back: "back",
  legs: "legs",
  hips: "hips",
  shoulders: "shoulders",
  arms: "arms",
  core: "core",
  cardio: "cardio",
};

// Tab icon mapping
export const TAB_ICONS: Record<string, IconName> = {
  index: "home",
  exercises: "dumbbell",
  "add-record": "plus",
  history: "list",
  menus: "menu",
};
