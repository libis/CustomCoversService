export class Cover{
    cover: File;
    type: string = '';
    code: string = '';

    constructor(coverFile: File, id_type: string, id_code: string){
        this.cover = coverFile;
        this.type = id_type;
        this.code = id_code;
    }
}