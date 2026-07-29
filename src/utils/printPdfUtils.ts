import html2pdf from 'html2pdf.js';

export interface PDFExportOptions {
  filename: string;
  elementId: string;
  orientation?: 'portrait' | 'landscape';
  margin?: number | [number, number, number, number];
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

// Global lock to prevent duplicate simultaneous PDF generation
let isGeneratingPDF = false;

// Helper functions to convert OKLCH color function to RGB for html2canvas compatibility
function oklchToRgb(lStr: string, cStr: string, hStr: string, aStr?: string): string {
  let L = 0;
  if (lStr.endsWith('%')) {
    L = parseFloat(lStr) / 100;
  } else {
    L = parseFloat(lStr);
  }

  let C = 0;
  if (cStr.endsWith('%')) {
    C = (parseFloat(cStr) / 100) * 0.4;
  } else {
    C = parseFloat(cStr);
  }

  let H = 0;
  if (hStr.endsWith('deg')) {
    H = parseFloat(hStr);
  } else if (hStr.endsWith('rad')) {
    H = parseFloat(hStr) * (180 / Math.PI);
  } else if (hStr.endsWith('turn')) {
    H = parseFloat(hStr) * 360;
  } else {
    H = parseFloat(hStr);
  }

  const hRad = (H * Math.PI) / 180;
  const a_lab = C * Math.cos(hRad);
  const b_lab = C * Math.sin(hRad);

  const L_lms = L + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
  const M_lms = L - 0.1055613458 * a_lab - 0.0638541728 * b_lab;
  const S_lms = L - 0.0894841775 * a_lab - 1.2914855480 * b_lab;

  const lms_L = Math.pow(Math.max(0, L_lms), 3);
  const lms_M = Math.pow(Math.max(0, M_lms), 3);
  const lms_S = Math.pow(Math.max(0, S_lms), 3);

  const r_lin = +4.0767416621 * lms_L - 3.3077115913 * lms_M + 0.2309699292 * lms_S;
  const g_lin = -1.2684380046 * lms_L + 2.6097574011 * lms_M - 0.3413193965 * lms_S;
  const b_lin = -0.0041960863 * lms_L - 0.7034186145 * lms_M + 1.7076147010 * lms_S;

  const gamma = (x: number) => {
    const clipped = Math.max(0, Math.min(1, x));
    return clipped <= 0.0031308
      ? 12.92 * clipped
      : 1.055 * Math.pow(clipped, 1 / 2.4) - 0.055;
  };

  const r = Math.round(gamma(r_lin) * 255);
  const g = Math.round(gamma(g_lin) * 255);
  const b = Math.round(gamma(b_lin) * 255);

  if (aStr !== undefined) {
    let alpha = 1;
    if (aStr.endsWith('%')) {
      alpha = parseFloat(aStr) / 100;
    } else {
      alpha = parseFloat(aStr);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return `rgb(${r}, ${g}, ${b})`;
}

function resolveOklchContent(content: string): string {
  const parts = content.split('/');
  const colorPart = parts[0].trim();
  const alphaPart = parts[1] ? parts[1].trim() : undefined;

  const colorValues = colorPart.split(/\s+/);
  if (colorValues.length < 3) {
    return 'rgb(59, 130, 246)'; // Safe Tailwind blue-500 fallback
  }

  const lStr = colorValues[0];
  const cStr = colorValues[1];
  const hStr = colorValues[2];

  if (lStr.includes('var') || cStr.includes('var') || hStr.includes('var')) {
    return 'rgb(59, 130, 246)';
  }

  let resolvedAlpha: string | undefined = undefined;
  if (alphaPart) {
    if (alphaPart.includes('var')) {
      const fallbackMatch = alphaPart.match(/,\s*([0-9.]+)/);
      if (fallbackMatch) {
        resolvedAlpha = fallbackMatch[1];
      } else {
        resolvedAlpha = '1';
      }
    } else {
      resolvedAlpha = alphaPart;
    }
  }

  try {
    return oklchToRgb(lStr, cStr, hStr, resolvedAlpha);
  } catch (e) {
    return 'rgb(59, 130, 246)';
  }
}

export function replaceOklchWithRgb(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let index = 0;
  let result = '';

  while (index < text.length) {
    const oklchIndex = text.toLowerCase().indexOf('oklch(', index);
    if (oklchIndex === -1) {
      result += text.slice(index);
      break;
    }

    result += text.slice(index, oklchIndex);

    let parenCount = 1;
    let scanIndex = oklchIndex + 6;
    while (scanIndex < text.length && parenCount > 0) {
      const char = text[scanIndex];
      if (char === '(') {
        parenCount++;
      } else if (char === ')') {
        parenCount--;
      }
      scanIndex++;
    }

    const oklchContent = text.slice(oklchIndex + 6, scanIndex - 1);
    const resolvedColor = resolveOklchContent(oklchContent);
    result += resolvedColor;

    index = scanIndex;
  }

  return result;
}

/**
 * Downloads an HTML element as a high-quality A4 PDF file.
 */
export async function downloadElementAsPDF({
  elementId,
  filename,
  orientation = 'portrait',
  margin = [10, 10, 10, 10],
  onStart,
  onSuccess,
  onError,
}: PDFExportOptions): Promise<boolean> {
  if (isGeneratingPDF) {
    console.warn('PDF generation already in progress...');
    return false;
  }

  const element = document.getElementById(elementId);
  if (!element) {
    const error = new Error(`Element with id "${elementId}" not found for PDF export.`);
    console.error(error);
    if (onError) onError(error);
    return false;
  }

  try {
    isGeneratingPDF = true;
    if (onStart) onStart();

    const cleanFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;

    const opt = {
      margin,
      filename: cleanFilename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        backgroundColor: '#FFFFFF',
        onclone: (clonedDoc: Document) => {
          // 1. Sanitize all <style> blocks in cloned document
          const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
          styleTags.forEach((styleTag) => {
            if (styleTag.textContent) {
              styleTag.textContent = replaceOklchWithRgb(styleTag.textContent);
            }
          });

          // 2. Replace any <link rel="stylesheet"> with sanitized <style> tags if cssRules are readable
          const linkTags = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
          linkTags.forEach((link) => {
            try {
              const href = (link as HTMLLinkElement).href;
              const sheet = Array.from(document.styleSheets).find((s) => s.href === href);
              if (sheet) {
                const rules = Array.from(sheet.cssRules || []).map((r) => r.cssText).join('\n');
                if (rules && rules.toLowerCase().includes('oklch')) {
                  const newStyle = clonedDoc.createElement('style');
                  newStyle.textContent = replaceOklchWithRgb(rules);
                  link.parentNode?.replaceChild(newStyle, link);
                }
              }
            } catch (e) {
              // ignore cross-origin sheet errors
            }
          });

          // 3. Convert all inline styles with oklch
          const elementsWithStyle = Array.from(clonedDoc.querySelectorAll('[style]'));
          elementsWithStyle.forEach((el) => {
            const styleAttr = el.getAttribute('style');
            if (styleAttr && styleAttr.toLowerCase().includes('oklch')) {
              el.setAttribute('style', replaceOklchWithRgb(styleAttr));
            }
          });

          // 4. Inspect computed styles on all elements and convert any property containing oklch
          const allElements = Array.from(clonedDoc.querySelectorAll('*')) as HTMLElement[];
          const win = clonedDoc.defaultView || window;
          allElements.forEach((el) => {
            try {
              const computed = win.getComputedStyle(el);
              const colorProps = [
                'color',
                'background-color',
                'border-color',
                'border-top-color',
                'border-right-color',
                'border-bottom-color',
                'border-left-color',
                'outline-color',
                'fill',
                'stroke',
                'box-shadow',
              ] as const;

              colorProps.forEach((prop) => {
                const val = computed.getPropertyValue(prop);
                if (val && val.toLowerCase().includes('oklch')) {
                  el.style.setProperty(prop, replaceOklchWithRgb(val), 'important');
                }
              });
            } catch (e) {
              // ignore
            }
          });
        },
      },
      jsPDF: {
        unit: 'mm' as const,
        format: 'a4' as const,
        orientation,
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    // Execute html2pdf save
    await html2pdf().set(opt).from(element).save();

    if (onSuccess) onSuccess();
    return true;
  } catch (err: any) {
    console.error('Failed to generate PDF:', err);
    if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    return false;
  } finally {
    isGeneratingPDF = false;
  }
}

/**
 * Triggers standard browser print dialog targeting the specified element.
 */
export function printElement(elementId: string, documentTitle?: string): boolean {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found for printing.`);
    return false;
  }

  // Set printable class on body to ensure @media print targets correctly
  const originalTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }

  // Add printing attribute to the element
  element.setAttribute('data-print-active', 'true');

  try {
    window.print();
    return true;
  } catch (err) {
    console.error('Print failed:', err);
    return false;
  } finally {
    element.removeAttribute('data-print-active');
    document.title = originalTitle;
  }
}

