import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportCanvas = async (
  canvasElement: HTMLCanvasElement,
  format: 'png' | 'pdf',
  quality: number = 1.0
): Promise<void> => {
  try {
    if (format === 'png') {
      const link = document.createElement('a');
      link.download = `whiteboard-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvasElement.toDataURL('image/png', quality);
      link.click();
    } else if (format === 'pdf') {
      // Convert canvas to image data
      const imgData = canvasElement.toDataURL('image/png', 1.0);
      const canvasAspectRatio = canvasElement.width / canvasElement.height;
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = pdfWidth / canvasAspectRatio;
      const pdf = new jsPDF({
        orientation: canvasAspectRatio > 1 ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`whiteboard-${new Date().toISOString().split('T')[0]}.pdf`);
    }
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed. Please try again.');
  }
};
export const exportWholeCanvas = async (
  canvasContainer: HTMLElement,
  format: 'png' | 'pdf',
  quality: number = 1.0
): Promise<void> => {
  try {
    // Use html2canvas to capture the entire canvas container
    const canvas = await html2canvas(canvasContainer, {
      backgroundColor: '#ffffff',
      scale: quality,
      useCORS: true,
      allowTaint: true,
    });

    if (format === 'png') {
      const link = document.createElement('a');
      link.download = `whiteboard-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', quality);
      link.click();
    } else if (format === 'pdf') {
      const imgData = canvas.toDataURL('image/png', 1.0);
      const canvasAspectRatio = canvas.width / canvas.height;
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = pdfWidth / canvasAspectRatio;
      const pdf = new jsPDF({
        orientation: canvasAspectRatio > 1 ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, 297)); // A4 height limit
      pdf.save(`whiteboard-${new Date().toISOString().split('T')[0]}.pdf`);
    }
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed. Please try again.');
  }
};
