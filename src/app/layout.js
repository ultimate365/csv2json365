import "./globals.css";
import "bootstrap/dist/css/bootstrap.css";
import BootstrapClient from "../components/BootstrapClient";
import { Toaster } from 'react-hot-toast';
export const metadata = {
  title: "CSV2JSON || JSON2CSV",
  description: "CSV2JSON OR JSON2CSV Converter",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
        <BootstrapClient />
      </body>
    </html>
  );
}
