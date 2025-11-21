import jsPDF from 'jspdf';

interface CertificateData {
  userName: string;
  courseName: string;
  completionDate: string;
  totalChapters: number;
}

export const generateCertificate = ({ userName, courseName, completionDate, totalChapters }: CertificateData) => {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Set background gradient (simulate with filled rectangles)
  pdf.setFillColor(255, 248, 240); // Light orange background
  pdf.rect(0, 0, 297, 210, 'F');
  
  // Add decorative border
  pdf.setDrawColor(255, 140, 0);
  pdf.setLineWidth(2);
  pdf.rect(10, 10, 277, 190);
  
  pdf.setDrawColor(255, 165, 0);
  pdf.setLineWidth(1);
  pdf.rect(12, 12, 273, 186);

  // Certificate Title
  pdf.setFontSize(40);
  pdf.setTextColor(255, 140, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Certificate of Completion', 148.5, 50, { align: 'center' });

  // Subtitle line
  pdf.setDrawColor(255, 165, 0);
  pdf.setLineWidth(0.5);
  pdf.line(80, 58, 217, 58);

  // This certifies text
  pdf.setFontSize(14);
  pdf.setTextColor(100, 100, 100);
  pdf.setFont('helvetica', 'normal');
  pdf.text('This certifies that', 148.5, 75, { align: 'center' });

  // User name
  pdf.setFontSize(28);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text(userName, 148.5, 90, { align: 'center' });

  // Has successfully completed
  pdf.setFontSize(14);
  pdf.setTextColor(100, 100, 100);
  pdf.setFont('helvetica', 'normal');
  pdf.text('has successfully completed the course', 148.5, 105, { align: 'center' });

  // Course name
  pdf.setFontSize(22);
  pdf.setTextColor(255, 140, 0);
  pdf.setFont('helvetica', 'bold');
  
  // Word wrap for long course names
  const maxWidth = 220;
  const courseLines = pdf.splitTextToSize(courseName, maxWidth);
  const courseY = 120;
  courseLines.forEach((line: string, index: number) => {
    pdf.text(line, 148.5, courseY + (index * 10), { align: 'center' });
  });

  // Course details
  const detailsY = courseY + (courseLines.length * 10) + 15;
  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Completed ${totalChapters} chapters`, 148.5, detailsY, { align: 'center' });

  // Date
  pdf.setFontSize(11);
  pdf.setTextColor(120, 120, 120);
  pdf.text(`Date: ${completionDate}`, 148.5, detailsY + 10, { align: 'center' });

  // Footer decoration
  pdf.setDrawColor(255, 165, 0);
  pdf.setLineWidth(0.5);
  pdf.line(80, detailsY + 20, 217, detailsY + 20);

  // Congratulations message
  pdf.setFontSize(10);
  pdf.setTextColor(150, 150, 150);
  pdf.setFont('helvetica', 'italic');
  pdf.text('🎓 Congratulations on your achievement! 🎓', 148.5, detailsY + 28, { align: 'center' });

  // Save the PDF
  pdf.save(`${courseName.replace(/[^a-z0-9]/gi, '_')}_Certificate.pdf`);
};
