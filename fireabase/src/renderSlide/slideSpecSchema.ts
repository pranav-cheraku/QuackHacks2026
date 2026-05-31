import { SchemaType } from "@google/generative-ai";

// -- Reusable primitives -----------------------------------------------------

const positionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    x: { type: SchemaType.NUMBER },
    y: { type: SchemaType.NUMBER },
  },
  required: ["x", "y"],
};

const sizeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    w: { type: SchemaType.NUMBER },
    h: { type: SchemaType.NUMBER },
  },
  required: ["w", "h"],
};

const styleSchema = {
  type: SchemaType.OBJECT,
};

// -- Theme -------------------------------------------------------------------

const themeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    background: { type: SchemaType.STRING },
    palette: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    fontFamily: { type: SchemaType.STRING },
  },
  required: ["background", "palette", "fontFamily"],
};

// -- Elements ----------------------------------------------------------------

const elementTypeSchema = {
  type: SchemaType.STRING,
  enum: [
    "header",
    "subheader",
    "body",
    "quote",
    "byline",
    "list",
    "stat",
    "image",
    "chart",
    "divider",
  ],
};

const layoutTypeSchema = {
  type: SchemaType.STRING,
  enum: [
    "full-bleed",
    "split-left",
    "split-right",
    "grid-2",
    "grid-3",
    "centered",
  ],
};

const elementSchema = {
  type: SchemaType.OBJECT,
  properties: {
    id:       { type: SchemaType.STRING },
    type:     elementTypeSchema,
    position: positionSchema,
    size:     sizeSchema,
    zIndex:   { type: SchemaType.NUMBER },
    opacity:  { type: SchemaType.NUMBER },
    content:  { type: SchemaType.STRING },
    style:    styleSchema,
  },
  required: ["id", "type", "position", "size", "zIndex"],
};

// -- Root --------------------------------------------------------------------

export const slideSpecSchema = {
  type: SchemaType.OBJECT,
  properties: {
    id:       { type: SchemaType.STRING },
    layout:   layoutTypeSchema,
    theme:    themeSchema,
    elements: { type: SchemaType.ARRAY, items: elementSchema },
  },
  required: ["id", "layout", "theme", "elements"],
};
