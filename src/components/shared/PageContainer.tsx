export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`p-6 bg-gray-50 min-h-full ${className}`}>
      {children}
    </div>
  );
}
