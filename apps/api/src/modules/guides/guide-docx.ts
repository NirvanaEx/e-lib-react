import fs from "fs/promises";
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  TextRun
} from "docx";
import { readImageSize } from "./guide-image-size";

export type DocxBlock = {
  number: number;
  title: string;
  body: string;
  imagePath?: string | null;
};

// Ширина текста на A4 при полях 2 см: 17 см ≈ 643 px при 96 dpi.
const CONTENT_WIDTH_PX = 643;

// Мини-разметка: пустая строка — новый абзац, «- » — маркер, «1. » — нумерация,
// **жирный** — выделение. Того же набора придерживается редактор в панели.
function inlineRuns(text: string, options: { size?: number } = {}) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part) => {
    const bold = part.startsWith("**") && part.endsWith("**") && part.length > 4;
    return new TextRun({
      text: bold ? part.slice(2, -2) : part,
      bold,
      size: options.size
    });
  });
}

function bodyParagraphs(body: string) {
  const paragraphs: Paragraph[] = [];
  const lines = String(body || "").replace(/\r\n/g, "\n").split("\n");

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    const bullet = line.match(/^[-—•]\s+(.*)$/);
    if (bullet) {
      paragraphs.push(
        new Paragraph({
          children: inlineRuns(bullet[1]),
          bullet: { level: 0 },
          spacing: { after: 80 }
        })
      );
      return;
    }

    const numbered = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (numbered) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: `${numbered[1]}. `, bold: true }), ...inlineRuns(numbered[2])],
          indent: { left: 340 },
          spacing: { after: 80 }
        })
      );
      return;
    }

    paragraphs.push(
      new Paragraph({
        children: inlineRuns(line),
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120, line: 276 }
      })
    );
  });

  return paragraphs;
}

async function imageParagraphs(block: DocxBlock) {
  if (!block.imagePath) return [];
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(block.imagePath);
  } catch {
    return [];
  }
  const size = readImageSize(buffer) || { width: 1440, height: 900 };
  const width = Math.min(CONTENT_WIDTH_PX, size.width);
  const height = Math.round((size.height * width) / size.width);
  const type = block.imagePath.toLowerCase().endsWith(".png")
    ? "png"
    : block.imagePath.toLowerCase().endsWith(".webp")
      ? "gif"
      : "jpg";

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [
        new ImageRun({
          data: buffer,
          type: type as any,
          transformation: { width, height }
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `Рисунок ${block.number}. ${block.title}`,
          italics: true,
          size: 18,
          color: "5a6473"
        })
      ]
    })
  ];
}

export async function buildGuideDocx(params: {
  title: string;
  subtitle?: string;
  blocks: DocxBlock[];
}): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      text: params.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 }
    })
  ];

  if (params.subtitle) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: params.subtitle, color: "5a6473" })],
        spacing: { after: 320 }
      })
    );
  }

  children.push(
    new Paragraph({
      text: "Содержание",
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 120 }
    })
  );
  params.blocks.forEach((block) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${block.number}. ${block.title}` })],
        spacing: { after: 60 },
        indent: { left: 220 }
      })
    );
  });

  for (const block of params.blocks) {
    // Блок = страница: иначе скриншот уезжает от своего текста на разворот.
    children.push(
      new Paragraph({
        text: `${block.number}. ${block.title}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { after: 140 }
      })
    );
    bodyParagraphs(block.body).forEach((paragraph) => children.push(paragraph));
    (await imageParagraphs(block)).forEach((paragraph) => children.push(paragraph));
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
          }
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "8a94a6" })]
              })
            ]
          })
        },
        children
      }
    ]
  });

  return Packer.toBuffer(doc);
}
