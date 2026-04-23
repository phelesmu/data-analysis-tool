import { useState, useRef } from 'react'
import { UploadSimple, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  isLoading?: boolean
}

export function FileUpload({ onFileSelect, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFile = (file: File) => {
    const validExtensions = ['.csv', '.xlsx', '.xls']
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error(t('fileUpload.invalidType'), {
        description: t('fileUpload.invalidTypeDesc')
      })
      return
    }
    
    if (file.size > 50 * 1024 * 1024) {
      toast.error(t('fileUpload.fileTooLarge'), {
        description: t('fileUpload.fileTooLargeDesc')
      })
      return
    }
    
    onFileSelect(file)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200',
        isDragging 
          ? 'border-accent bg-accent/10 scale-[1.02]' 
          : 'border-border hover:border-accent/50 hover:bg-accent/5',
        isLoading && 'pointer-events-none opacity-60'
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      <div className="flex flex-col items-center gap-4">
        {isLoading ? (
          <CheckCircle size={48} weight="duotone" className="text-accent animate-pulse" />
        ) : (
          <UploadSimple size={48} weight="duotone" className="text-muted-foreground" />
        )}
        
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground">
            {isLoading ? t('fileUpload.processing') : t('fileUpload.upload')}
          </p>
          <p className="text-sm text-muted-foreground">{t('fileUpload.dragOrClick')}</p>
          <p className="text-xs text-muted-foreground">
            {t('fileUpload.supports')}
          </p>
        </div>
        
        {!isLoading && (
          <Button 
            type="button" 
            size="lg"
            className="mt-2"
            onClick={(e) => {
              e.stopPropagation()
              handleClick()
            }}
          >
            <UploadSimple size={20} weight="bold" className="mr-2" />
            {t('fileUpload.selectFile')}
          </Button>
        )}
      </div>
    </div>
  )
}
