export type ClassValue =
  | string
  | number
  | null
  | boolean
  | undefined
  | ClassDictionary
  | ClassValue[];

interface ClassDictionary {
  [id: string]: any;
}

function toVal(mix: ClassValue): string {
  let str = "";
  if (typeof mix === "string" || typeof mix === "number") {
    str += mix;
  } else if (Array.isArray(mix)) {
    for (const item of mix) {
      const inner = toVal(item);
      if (inner) {
        if (str) str += " ";
        str += inner;
      }
    }
  } else if (typeof mix === "object" && mix) {
    for (const key in mix as ClassDictionary) {
      if ((mix as ClassDictionary)[key]) {
        if (str) str += " ";
        str += key;
      }
    }
  }
  return str;
}

export function cn(...inputs: ClassValue[]): string {
  let className = "";
  for (const input of inputs) {
    const value = toVal(input);
    if (!value) continue;
    if (className) className += " ";
    className += value;
  }
  return className;
}
