
type CreateSubtitleProps= {
    subtitle: string;
    appear?: boolean;
};
const CreateSubtitle: React.FC<CreateSubtitleProps> = ({subtitle, appear = true}) => {
    if (appear) {
        return (
            <h2 className="subsection-title">{subtitle}</h2>
        );
    }   
}

export default CreateSubtitle;